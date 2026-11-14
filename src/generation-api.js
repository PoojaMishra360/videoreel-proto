import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { connectToDatabase } from "./db.js";
import { getAuthenticatedUser } from "./auth.js";

const projectRoot = new URL("..", import.meta.url);
const runsRoot = new URL("../runs/", import.meta.url);
const tsxCli = new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url);
const cliFile = new URL("./cli.ts", import.meta.url);
const generationInput = z.object({
  topic: z.string().trim().min(3).max(500),
  duration: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  level: z.enum(["kids", "beginner", "intermediate", "expert"]),
  format: z.enum(["9:16", "1:1", "16:9"]),
}).strict();
const progressByStage = new Map([
  ["0 moderation", 5],
  ["1 intake", 15],
  ["2 research", 30],
  ["3 script", 45],
  ["4 fact-check", 58],
  ["5 narration, captions and timeline", 72],
  ["6 Remotion render", 85],
]);

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === request.headers.host; } catch { return false; }
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 12_000) throw Object.assign(new Error("Request is too large."), { status: 413 });
  }
  try { return JSON.parse(body); } catch { throw Object.assign(new Error("Body must be valid JSON."), { status: 400 }); }
}

function stageProgress(stage) {
  if (progressByStage.has(stage)) return progressByStage.get(stage);
  return stage.startsWith("Blocked:") ? 100 : 5;
}

function safeId(value) {
  return /^[a-f0-9]{24}$/i.test(value);
}

function runDirectory(userId, runId) {
  if (!/^[a-f0-9]{24}$/i.test(userId) || !/^[a-f0-9-]{36}$/i.test(runId)) throw new Error("Invalid run path.");
  return new URL(`../runs/users/${userId}/${runId}/`, import.meta.url);
}

async function setJobStatus(db, jobId, userId, updates) {
  await db.collection("generation_jobs").updateOne({ _id: jobId, userId }, { $set: { ...updates, updatedAt: new Date() } });
}

async function finishJob(db, job, exitCode) {
  if (exitCode === 0) {
    await setJobStatus(db, job._id, job.userId, { status: "succeeded", currentStage: "ready", progress: 100, finishedAt: new Date() });
    await db.collection("credit_ledger").insertOne({ userId: job.userId, type: "charge", amount: 0, balanceAfter: job.balanceAfterHold, refJobId: job._id, note: "Generation completed; reserved credits committed", createdAt: new Date() });
    return;
  }

  const mongoSession = db.client.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      const current = await db.collection("generation_jobs").findOne({ _id: job._id, userId: job.userId }, { session: mongoSession });
      if (!current || current.status === "succeeded" || current.status === "failed") return;
      const user = await db.collection("users").findOneAndUpdate(
        { _id: job.userId },
        { $inc: { creditsBalance: job.creditEstimate }, $set: { updatedAt: new Date() } },
        { session: mongoSession, returnDocument: "after" },
      );
      const balance = user?.creditsBalance ?? job.balanceAfterHold + job.creditEstimate;
      await db.collection("credit_ledger").insertOne({ userId: job.userId, type: "release", amount: job.creditEstimate, balanceAfter: balance, refJobId: job._id, note: "Generation failed; reserved credits released", createdAt: new Date() }, { session: mongoSession });
      await db.collection("generation_jobs").updateOne({ _id: job._id, userId: job.userId }, { $set: { status: "failed", currentStage: "failed", progress: current.progress ?? 0, errorCode: "GENERATION_FAILED", finishedAt: new Date(), updatedAt: new Date() } }, { session: mongoSession });
    });
  } finally {
    await mongoSession.endSession();
  }
}

function launchGeneration(db, job) {
  const outputDir = runDirectory(job.userId.toString(), job.runId);
  const child = spawn(process.execPath, [
    fileURLToPath(tsxCli),
    fileURLToPath(cliFile),
    job.topic,
    `--duration=${job.duration}`,
    `--level=${job.level}`,
    `--format=${job.format}`,
    `--output-dir=${fileURLToPath(outputDir)}`,
  ], {
    cwd: fileURLToPath(projectRoot),
    env: {
      ...process.env,
      LLM_PROVIDER: process.env.LLM_PROVIDER?.trim() || "gemini",
      VOICE_PROVIDER: process.env.VOICE_PROVIDER?.trim() || (process.platform === "win32" ? "system" : "elevenlabs"),
    },
    windowsHide: true,
  });

  let stdoutBuffer = "";
  let updates = Promise.resolve();
  let finished = false;
  const finishOnce = (code) => {
    if (finished) return;
    finished = true;
    void updates.then(() => finishJob(db, job, code)).catch(() => finishJob(db, job, 1));
  };
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      const match = /^\[[\d.]+s\]\s+(.+)$/.exec(line.trim());
      if (!match) continue;
      const stage = match[1];
      updates = updates.then(() => setJobStatus(db, job._id, job.userId, { status: "running", currentStage: stage, progress: stageProgress(stage), startedAt: job.startedAt ?? new Date() })).catch(() => {});
    }
  });
  child.stderr.resume();
  child.on("error", () => finishOnce(1));
  child.on("close", (code) => finishOnce(code ?? 1));
}

async function createGeneration(request, response) {
  if (!sameOrigin(request)) return sendJson(response, 403, { error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed." } });
  const user = await getAuthenticatedUser(request);
  if (!user) return sendJson(response, 401, { error: { code: "UNAUTHENTICATED", message: "Sign in to generate a video." } });
  let body;
  try { body = await readJson(request); } catch (error) { return sendJson(response, error.status ?? 400, { error: { code: "INVALID_INPUT", message: error.message } }); }
  const parsed = generationInput.safeParse(body);
  if (!parsed.success) return sendJson(response, 400, { error: { code: "INVALID_INPUT", message: "Enter a topic (3–500 characters), choose 30/60/90 seconds, an audience, and a supported format." } });

  const db = await connectToDatabase();
  const { topic, duration, level, format } = parsed.data;
  const creditEstimate = Math.ceil(duration / 10);
  const jobId = new ObjectId();
  const runId = randomUUID();
  const now = new Date();
  let balanceAfterHold = 0;
  const mongoSession = db.client.startSession();
  try {
    await mongoSession.withTransaction(async () => {
      const active = await db.collection("generation_jobs").findOne({ userId: user._id, status: { $in: ["queued", "running"] } }, { session: mongoSession, projection: { _id: 1 } });
      if (active) throw Object.assign(new Error("A video is already being generated for this account."), { code: "GENERATION_ACTIVE" });
      const updatedUser = await db.collection("users").findOneAndUpdate(
        { _id: user._id, creditsBalance: { $gte: creditEstimate }, status: "active" },
        { $inc: { creditsBalance: -creditEstimate }, $set: { updatedAt: now } },
        { session: mongoSession, returnDocument: "after" },
      );
      if (!updatedUser) throw Object.assign(new Error("You do not have enough credits for this video."), { code: "INSUFFICIENT_CREDITS" });
      balanceAfterHold = updatedUser.creditsBalance;
      await db.collection("generation_jobs").insertOne({ _id: jobId, userId: user._id, runId, topic, duration, level, format, type: "full", status: "queued", currentStage: "queued", progress: 0, creditEstimate, balanceAfterHold, createdAt: now, updatedAt: now }, { session: mongoSession });
      await db.collection("credit_ledger").insertOne({ userId: user._id, type: "hold", amount: -creditEstimate, balanceAfter: balanceAfterHold, refJobId: jobId, note: "Video generation credits reserved", createdAt: now }, { session: mongoSession });
    });
  } catch (error) {
    const code = error.code;
    const status = code === "INSUFFICIENT_CREDITS" ? 402 : code === "GENERATION_ACTIVE" ? 409 : 503;
    return sendJson(response, status, { error: { code: code ?? "GENERATION_UNAVAILABLE", message: error.message ?? "Could not start generation." } });
  } finally {
    await mongoSession.endSession();
  }

  const job = { _id: jobId, userId: user._id, runId, topic, duration, level, format, creditEstimate, balanceAfterHold, startedAt: now };
  await setJobStatus(db, jobId, user._id, { status: "running", currentStage: "starting", progress: 1, startedAt: now });
  launchGeneration(db, job);
  return sendJson(response, 202, { jobId: jobId.toString(), status: "running", creditEstimate, creditsBalance: balanceAfterHold });
}

async function getGeneration(request, response, pathname) {
  const user = await getAuthenticatedUser(request);
  if (!user) return sendJson(response, 401, { error: { code: "UNAUTHENTICATED", message: "Sign in to view this generation." } });
  const match = /^\/api\/generations\/([a-f0-9]{24})$/.exec(pathname);
  if (!match) return sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Generation not found." } });
  const db = await connectToDatabase();
  const job = await db.collection("generation_jobs").findOne({ _id: new ObjectId(match[1]), userId: user._id });
  if (!job) return sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Generation not found." } });
  let script = null;
  if (job.status === "succeeded") {
    try { script = JSON.parse(await readFile(new URL("script-final.json", runDirectory(user._id.toString(), job.runId)), "utf8")); } catch {}
  }
  return sendJson(response, 200, {
    jobId: job._id.toString(),
    topic: job.topic,
    status: job.status,
    stage: job.currentStage,
    progress: job.progress ?? 0,
    errorCode: job.errorCode ?? null,
    creditsBalance: user.creditsBalance,
    videoUrl: job.status === "succeeded" ? `/api/generations/${job._id}/video` : null,
    script,
  });
}

async function serveOwnedVideo(request, response, pathname) {
  const user = await getAuthenticatedUser(request);
  if (!user) return sendJson(response, 401, { error: { code: "UNAUTHENTICATED", message: "Sign in to view this video." } });
  const match = /^\/api\/generations\/([a-f0-9]{24})\/video$/.exec(pathname);
  if (!match) return sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Video not found." } });
  const db = await connectToDatabase();
  const job = await db.collection("generation_jobs").findOne({ _id: new ObjectId(match[1]), userId: user._id, status: "succeeded" });
  if (!job) return sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Video not found." } });
  const filePath = new URL("out.mp4", runDirectory(user._id.toString(), job.runId));
  const file = await stat(filePath).catch(() => null);
  if (!file?.isFile()) return sendJson(response, 404, { error: { code: "VIDEO_NOT_FOUND", message: "Rendered video was not found." } });
  const headers = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const range = request.headers.range;
  if (!range) {
    response.writeHead(200, { ...headers, "Content-Length": file.size });
    if (request.method === "HEAD") return response.end();
    createReadStream(filePath).pipe(response);
    return;
  }
  const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!rangeMatch || (!rangeMatch[1] && !rangeMatch[2])) {
    response.writeHead(416, { ...headers, "Content-Range": `bytes */${file.size}` });
    response.end();
    return;
  }
  const start = rangeMatch[1] ? Number(rangeMatch[1]) : Math.max(0, file.size - Number(rangeMatch[2]));
  const end = rangeMatch[2] && rangeMatch[1] ? Math.min(Number(rangeMatch[2]), file.size - 1) : file.size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= file.size || end < start) {
    response.writeHead(416, { ...headers, "Content-Range": `bytes */${file.size}` });
    response.end();
    return;
  }
  response.writeHead(206, { ...headers, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${file.size}` });
  if (request.method === "HEAD") return response.end();
  createReadStream(filePath, { start, end }).pipe(response);
}

export async function handleGenerationRequest(request, response, pathname) {
  if (process.env.AUTH_PREVIEW === "true") return sendJson(response, 503, { error: { code: "AUTH_PREVIEW", message: "Live generation is disabled in UI preview mode." } });
  if (pathname === "/api/generations" && request.method === "POST") return createGeneration(request, response);
  if (pathname.startsWith("/api/generations/") && pathname.endsWith("/video") && (request.method === "GET" || request.method === "HEAD")) return serveOwnedVideo(request, response, pathname);
  if (pathname.startsWith("/api/generations/") && request.method === "GET") return getGeneration(request, response, pathname);
  return sendJson(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } });
}
