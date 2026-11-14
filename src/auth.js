import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { connectToDatabase } from "./db.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-videoreel_session" : "videoreel_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_COST = 32768;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELIZATION = 1;
const PASSWORD_KEY_LENGTH = 64;
const rateLimits = new Map();
const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

function json(response, status, data, extraHeaders = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders,
  });
  response.end(JSON.stringify(data));
}

function parseCookies(header = "") {
  const cookies = new Map();
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    cookies.set(key, value);
  }
  return cookies;
}

function sessionCookie(value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function clientAddress(request) {
  return request.socket.remoteAddress ?? "unknown";
}

function allowAttempt(request, response, route) {
  const now = Date.now();
  for (const [key, record] of rateLimits) {
    if (record.resetAt <= now) rateLimits.delete(key);
  }
  const key = `${route}:${clientAddress(request)}`;
  const record = rateLimits.get(key);
  if (record && record.count >= 8 && record.resetAt > now) {
    json(response, 429, { error: { code: "RATE_LIMITED", message: "Too many attempts. Please wait a few minutes and try again." } }, {
      "Retry-After": String(Math.ceil((record.resetAt - now) / 1000)),
    });
    return false;
  }
  if (!record || record.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
  } else {
    record.count += 1;
  }
  return true;
}

function validOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16 * 1024) throw Object.assign(new Error("Request is too large."), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
  }
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, PASSWORD_KEY_LENGTH, {
    N: PASSWORD_COST,
    r: PASSWORD_BLOCK_SIZE,
    p: PASSWORD_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${PASSWORD_COST}$${PASSWORD_BLOCK_SIZE}$${PASSWORD_PARALLELIZATION}$${salt.toString("hex")}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, cost, blockSize, parallelization, saltHex, keyHex] = encoded.split("$");
  if (algorithm !== "scrypt" || Number(cost) !== PASSWORD_COST || Number(blockSize) !== PASSWORD_BLOCK_SIZE || Number(parallelization) !== PASSWORD_PARALLELIZATION || !/^[a-f0-9]{32}$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(keyHex)) {
    return false;
  }
  const derived = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), PASSWORD_KEY_LENGTH, {
    N: PASSWORD_COST,
    r: PASSWORD_BLOCK_SIZE,
    p: PASSWORD_PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  }));
  return timingSafeEqual(derived, Buffer.from(keyHex, "hex"));
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    plan: user.plan,
    creditsBalance: user.creditsBalance,
  };
}

async function createSession(db, userId, response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.collection("sessions").insertOne({
    _id: tokenHash(token),
    userId,
    createdAt: new Date(),
    expiresAt,
  });
  response.setHeader("Set-Cookie", sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)));
}

async function currentUser(db, request) {
  const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
  if (!token || token.length > 128) return null;
  const session = await db.collection("sessions").findOne({ _id: tokenHash(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db.collection("users").findOne({ _id: session.userId, status: "active" });
  return user ? { session, user } : null;
}

export async function getAuthenticatedUser(request) {
  const db = await connectToDatabase();
  const authenticated = await currentUser(db, request);
  return authenticated?.user ?? null;
}

export async function handleAuthRequest(request, response, pathname) {
  const method = request.method ?? "GET";
  if (!validOrigin(request)) {
    json(response, 403, { error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed." } });
    return;
  }

  try {
    const db = await connectToDatabase();
    if (pathname === "/api/auth/me" && method === "GET") {
      const authenticated = await currentUser(db, request);
      if (!authenticated) {
        json(response, 401, { error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } });
        return;
      }
      json(response, 200, { user: publicUser(authenticated.user) });
      return;
    }

    if (pathname === "/api/auth/logout" && method === "POST") {
      const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE);
      if (token && token.length <= 128) {
        await db.collection("sessions").deleteOne({ _id: tokenHash(token) });
      }
      json(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
      return;
    }

    if (pathname !== "/api/auth/signup" && pathname !== "/api/auth/login") {
      json(response, 404, { error: { code: "NOT_FOUND", message: "Route not found." } });
      return;
    }
    if (method !== "POST") {
      json(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } }, { Allow: "POST" });
      return;
    }
    if (!allowAttempt(request, response, pathname)) return;

    const input = await readJson(request);
    if (pathname === "/api/auth/signup") {
      const parsed = signupSchema.safeParse(input);
      if (!parsed.success) {
        json(response, 400, { error: { code: "INVALID_INPUT", message: "Enter a name, valid email, and password with at least 8 characters." } });
        return;
      }
      const { name, password } = parsed.data;
      const email = parsed.data.email.toLowerCase();
      const existing = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });
      if (existing) {
        json(response, 409, { error: { code: "EMAIL_IN_USE", message: "An account with this email already exists. Sign in instead." } });
        return;
      }

      const now = new Date();
      const user = {
        email,
        name,
        passwordHash: await hashPassword(password),
        authProvider: "email",
        plan: "free",
        creditsBalance: 12,
        defaultLanguage: "en",
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
      const workspace = { ownerUserId: null, name: `${name}'s workspace`, createdAt: now };
      const creditGrant = { userId: null, type: "grant", amount: 12, balanceAfter: 12, note: "Welcome credits", createdAt: now };
      const mongoSession = db.client.startSession();
      try {
        await mongoSession.withTransaction(async () => {
          const inserted = await db.collection("users").insertOne(user, { session: mongoSession });
          user._id = inserted.insertedId;
          workspace.ownerUserId = inserted.insertedId;
          creditGrant.userId = inserted.insertedId;
          await db.collection("workspaces").insertOne(workspace, { session: mongoSession });
          await db.collection("credit_ledger").insertOne(creditGrant, { session: mongoSession });
        });
      } catch (error) {
        if (error?.code === 11000) {
          json(response, 409, { error: { code: "EMAIL_IN_USE", message: "An account with this email already exists. Sign in instead." } });
          return;
        }
        throw error;
      } finally {
        await mongoSession.endSession();
      }

      await createSession(db, user._id, response);
      json(response, 201, { user: publicUser(user) });
      return;
    }

    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      json(response, 400, { error: { code: "INVALID_INPUT", message: "Enter a valid email and password." } });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const user = await db.collection("users").findOne({ email });
    const validPassword = user?.passwordHash
      ? await verifyPassword(parsed.data.password, user.passwordHash)
      : await scrypt(parsed.data.password, Buffer.alloc(16), PASSWORD_KEY_LENGTH, {
        N: PASSWORD_COST,
        r: PASSWORD_BLOCK_SIZE,
        p: PASSWORD_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024,
      }).then(() => false);
    if (!user || !validPassword || user.status !== "active") {
      json(response, 401, { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
      return;
    }

    const now = new Date();
    await db.collection("users").updateOne({ _id: user._id }, { $set: { lastLoginAt: now, updatedAt: now } });
    await createSession(db, user._id, response);
    json(response, 200, { user: publicUser(user) });
  } catch (error) {
    console.error("Authentication request failed:", error?.name ?? "Error", error?.code ?? error?.cause?.code ?? "no-code");
    const status = Number.isInteger(error?.status) ? error.status : 503;
    const message = status < 500 ? error.message : "Authentication service is temporarily unavailable.";
    json(response, status, { error: { code: status === 503 ? "AUTH_UNAVAILABLE" : "REQUEST_ERROR", message } });
  }
}
