import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateNarration } from "./video-pipeline.js";
import { renderVideo } from "./render-video.js";

const args = process.argv.slice(2);
const runDir = args.find((value) => !value.startsWith("--"));
const option = (name, fallback) => args.find((value) => value.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
if (!runDir) {
  console.error('Usage: npm run video:render -- "runs/<run-id>" --format=9:16 --voice=system');
  process.exit(1);
}
const format = option("format", "9:16");
const voiceProvider = option("voice", process.env.VOICE_PROVIDER?.trim() || "elevenlabs");
const resolvedDir = resolve(runDir);
const script = JSON.parse(readFileSync(join(resolvedDir, "script-final.json"), "utf8"));
const composition = await generateNarration(script, resolvedDir, { format, voiceProvider });
writeFileSync(join(resolvedDir, "composition.json"), JSON.stringify({
  format: composition.format,
  width: composition.width,
  height: composition.height,
  fps: composition.fps,
  durationInFrames: composition.durationInFrames,
  durationSeconds: composition.durationSeconds,
  audioFile: composition.audioPath.split(/[\\/]/).at(-1),
  voiceProvider: composition.voiceProvider,
  scenes: composition.scenes,
  words: composition.words,
  subtitles: composition.subtitles,
}, null, 2));
const videoPath = join(resolvedDir, "out.mp4");
const thumbnailPath = join(resolvedDir, "thumbnail.png");
await renderVideo({ composition, outputPath: videoPath, thumbnailPath });
const reportPath = join(resolvedDir, "report.json");
let report = {};
try { report = JSON.parse(readFileSync(reportPath, "utf8")); } catch {}
report.format = format;
report.voiceProvider = voiceProvider;
report.outputs = ["script-final.json", "composition.json", composition.audioPath.split(/[\\/]/).at(-1), "captions.srt", "thumbnail.png", "out.mp4"];
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`Rendered ${videoPath}`);
console.log(`Thumbnail ${thumbnailPath}`);
