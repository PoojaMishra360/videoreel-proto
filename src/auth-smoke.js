import assert from "node:assert/strict";
import { connectToDatabase, closeDatabase } from "./db.js";

const baseUrl = process.env.AUTH_BASE_URL ?? "http://127.0.0.1:4173";
const email = `auth-smoke-${crypto.randomUUID()}@example.com`;
const password = `AuthSmoke-${crypto.randomUUID()}-only`;
const completed = [];

function sessionCookie(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "Expected the auth response to set a session cookie.");
  return value.split(";")[0];
}

try {
  const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Auth Smoke Test", email, password }),
  });
  const signup = await signupResponse.json();
  assert.equal(signupResponse.status, 201, `Signup failed with ${signupResponse.status} (${signup.error?.code ?? "unknown"}).`);
  assert.equal(signup.user.email, email);
  assert.equal(signup.user.creditsBalance, 12);
  let cookie = sessionCookie(signupResponse);
  completed.push("signup and welcome credits");

  const firstSessionResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
  const firstSession = await firstSessionResponse.json();
  assert.equal(firstSessionResponse.status, 200);
  assert.equal(firstSession.user.email, email);
  completed.push("signup session lookup");

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie } });
  assert.equal(logoutResponse.status, 200);
  const revokedSessionResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
  assert.equal(revokedSessionResponse.status, 401);
  completed.push("logout and session revocation");

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200, `Login failed with ${loginResponse.status} (${login.error?.code ?? "unknown"}).`);
  cookie = sessionCookie(loginResponse);
  const restoredSessionResponse = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie } });
  const restoredSession = await restoredSessionResponse.json();
  assert.equal(restoredSessionResponse.status, 200);
  assert.equal(restoredSession.user.email, email);
  completed.push("login and session persistence");

  const finalLogoutResponse = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie } });
  assert.equal(finalLogoutResponse.status, 200);
  completed.push("final logout");
  console.log(`Authentication checks passed: ${completed.join(", ")}.`);
} finally {
  const db = await connectToDatabase();
  const user = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });
  if (user) {
    await Promise.all([
      db.collection("sessions").deleteMany({ userId: user._id }),
      db.collection("workspaces").deleteMany({ ownerUserId: user._id }),
      db.collection("credit_ledger").deleteMany({ userId: user._id }),
      db.collection("users").deleteOne({ _id: user._id }),
    ]);
  }
  await closeDatabase();
  console.log("Disposable account and related records removed.");
}
