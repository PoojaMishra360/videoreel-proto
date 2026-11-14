import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { ObjectId } from "mongodb";
import { connectToDatabase, closeDatabase } from "./db.js";

const baseUrl = process.env.GENERATION_BASE_URL ?? "http://127.0.0.1:4173";
const email = `generation-smoke-${randomUUID()}@example.com`;
const password = `GenerationSmoke-${randomUUID()}-only`;
let userId;
let jobId;
let runId;
let lastStage = "";

try {
  const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Generation Smoke Test", email, password }),
  });
  const signup = await signupResponse.json();
  assert.equal(signupResponse.status, 201, `Test signup failed with HTTP ${signupResponse.status}.`);
  userId = signup.user.id;
  const cookie = signupResponse.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Signup did not create an authenticated session.");

  const startResponse = await fetch(`${baseUrl}/api/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ topic: "What is Node.js?", duration: 30, level: "beginner", format: "9:16" }),
  });
  const started = await startResponse.json();
  assert.equal(startResponse.status, 202, `Generation start failed with HTTP ${startResponse.status} (${started.error?.code ?? "unknown"}).`);
  jobId = started.jobId;
  console.log(`Live Node.js generation started (${started.creditEstimate} test credits reserved).`);

  const deadline = Date.now() + 15 * 60 * 1000;
  let completed;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const response = await fetch(`${baseUrl}/api/generations/${jobId}`, { headers: { cookie }, cache: "no-store" });
    completed = await response.json();
    assert.equal(response.status, 200, `Could not poll generation (HTTP ${response.status}).`);
    if (completed.stage !== lastStage) {
      lastStage = completed.stage;
      console.log(`Generation: ${completed.progress}% · ${completed.stage}`);
    }
    if (completed.status === "succeeded") break;
    if (completed.status === "failed") throw new Error(`Generation failed (${completed.errorCode ?? "GENERATION_FAILED"}); reserved test credits are expected to be released.`);
  }
  assert.equal(completed?.status, "succeeded", "Generation did not complete within 15 minutes.");
  assert.ok(completed.script?.title, "Generated script title is missing.");
  assert.ok(completed.videoUrl, "Generated video URL is missing.");

  const videoResponse = await fetch(`${baseUrl}${completed.videoUrl}`, { headers: { cookie, Range: "bytes=0-63" } });
  assert.equal(videoResponse.status, 206, "Video endpoint did not return HTTP 206 for a byte-range request.");
  assert.match(videoResponse.headers.get("content-type") ?? "", /video\/mp4/);
  assert.equal((await videoResponse.arrayBuffer()).byteLength, 64);
  console.log(`Live generation passed: ${completed.script.title}; authenticated MP4 range playback is available.`);

  const db = await connectToDatabase();
  const job = await db.collection("generation_jobs").findOne({ _id: new ObjectId(jobId), userId: new ObjectId(userId) });
  runId = job?.runId;
} finally {
  const db = await connectToDatabase();
  const mongoUserId = userId ? new ObjectId(userId) : null;
  if (mongoUserId) {
    const jobFilter = jobId ? { _id: new ObjectId(jobId), userId: mongoUserId } : { userId: mongoUserId };
    const job = await db.collection("generation_jobs").findOne(jobFilter, { projection: { runId: 1 } });
    runId = runId ?? job?.runId;
    await Promise.all([
      db.collection("sessions").deleteMany({ userId: mongoUserId }),
      db.collection("workspaces").deleteMany({ ownerUserId: mongoUserId }),
      db.collection("credit_ledger").deleteMany({ userId: mongoUserId }),
      db.collection("generation_jobs").deleteMany({ userId: mongoUserId }),
      db.collection("users").deleteOne({ _id: mongoUserId }),
    ]);
    if (runId) await rm(join("runs", "users", userId, runId), { recursive: true, force: true });
  }
  await closeDatabase();
  console.log("Disposable generation account and related records removed.");
}
