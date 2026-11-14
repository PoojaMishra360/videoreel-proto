import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderVideo } from "./render-video.js";
import { alignWordCharacters, captionCues, sentenceScenes, wordsFromAlignment } from "./video-pipeline.js";

const tempDir = await mkdtemp(join(tmpdir(), "videoreel-render-smoke-"));
const audioPath = join(tempDir, "narration.mp3");
const outputPath = join(tempDir, "smoke.mp4");
const thumbnailPath = join(tempDir, "thumbnail.png");

try {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-q:a", "8", audioPath]);
  const sampleText = "Plants turn light into food.";
  const characters = Array.from(sampleText);
  const aligned = wordsFromAlignment({
    characters,
    character_start_times_seconds: characters.map((_, index) => index * 0.06),
    character_end_times_seconds: characters.map((_, index) => index * 0.06 + 0.05),
  });
  const words = alignWordCharacters(sampleText, aligned);
  const scenes = sentenceScenes([{ text: sampleText, role: "point" }], words, 30, 60);
  const subtitles = captionCues(aligned, 6);
  assert.equal(words[0].text, "Plants");
  assert.equal(scenes.length, 1);
  assert.ok(subtitles.length > 0);
  const composition = {
    audioPath,
    width: 540,
    height: 960,
    fps: 30,
    durationInFrames: 60,
    scenes,
    subtitles,
    words: aligned,
  };
  await renderVideo({ composition, outputPath, thumbnailPath });
  const [output, thumbnail] = await Promise.all([stat(outputPath), stat(thumbnailPath)]);
  assert.ok(output.size > 10_000, "Expected a non-empty MP4 output.");
  assert.ok(thumbnail.size > 1_000, "Expected a non-empty PNG thumbnail.");
  const metadata = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", outputPath], { encoding: "utf8" }));
  assert.ok(Number(metadata.format.duration) >= 1.9, "Expected rendered audio/video duration to be around two seconds.");
  console.log(`Remotion render smoke test passed (${output.size} byte MP4, ${thumbnail.size} byte thumbnail, ${Number(metadata.format.duration).toFixed(2)}s).`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
