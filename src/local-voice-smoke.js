import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const tempDir = await mkdtemp(join(tmpdir(), "videoreel-voice-smoke-"));
const outputPath = join(tempDir, "voice.wav");
const scriptPath = fileURLToPath(new URL("./local-voice.ps1", import.meta.url));
try {
  const result = await new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `Local voice exited with code ${code}.`)));
    child.stdin.end(JSON.stringify({ text: "Testing the local speech voice.", outputPath }));
  });
  const speech = JSON.parse(result);
  const output = await stat(outputPath);
  const metadata = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", outputPath], { encoding: "utf8" }));
  assert.ok(output.size > 1_000, "Expected a synthesized WAV file.");
  assert.ok(Number(metadata.format.duration) > 0);
  assert.ok(speech.words.length >= 5);
  assert.equal(speech.words[0].text, "Testing");
  console.log(`Windows local voice smoke test passed (${output.size} byte WAV, ${speech.words.length} aligned words, ${Number(metadata.format.duration).toFixed(2)}s).`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
