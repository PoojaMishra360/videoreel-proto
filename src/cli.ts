import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { costLedger } from "./llm.js";
import { moderate, intake, research, writeScript, factCheck } from "./stages.js";
import { generateNarration } from "./video-pipeline.js";
import { renderVideo } from "./render-video.js";

const args = process.argv.slice(2);
const topic = args.find((a) => !a.startsWith("--"));
const opt = (n: string, d: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
if (!topic) {
  console.error('Usage: npm run gen -- "Your topic" --duration=60 --level=beginner --format=9:16');
  process.exit(1);
}
const duration = Number(opt("duration", "60"));
const level = opt("level", "beginner");
const format = opt("format", "9:16");
const configuredOutputDir = opt("output-dir", "");
if (!["9:16", "1:1", "16:9"].includes(format)) {
  console.error("Format must be one of 9:16, 1:1, or 16:9.");
  process.exit(1);
}
const videoFormat = format as "9:16" | "1:1" | "16:9";

const runId = new Date().toISOString().replace(/[:.]/g, "-");
const dir = resolve(configuredOutputDir || join("runs", runId));
mkdirSync(dir, { recursive: true });
const save = (name: string, data: unknown) => writeFileSync(join(dir, name), JSON.stringify(data, null, 2));
const t0 = Date.now();
const step = (n: string) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${n}`);

step("0 moderation");
const mod = await moderate(topic);
save("0-moderation.json", mod);
if (!mod.allowed) {
  console.error(`Blocked: ${mod.reason}`);
  process.exit(2);
}

step("1 intake");
const brief = await intake(topic, level, duration);
save("1-brief.json", brief);

step("2 research");
const res = await research(brief);
save("2-research.json", res);
if (res.sources.length < 2) console.warn("Warning: fewer than 2 sources found, marking UNVERIFIED");

step("3 script");
const script = await writeScript(brief, res.notes, duration);
save("3-script.json", script);

step("4 fact-check");
const fc = await factCheck(script, res.notes);
save("4-factcheck.json", fc);

const final = fc.revised;
const words = final.sentences.map((s) => s.text).join(" ").split(/\s+/).length;
save("script-final.json", { ...final, words, sources: res.sources, unverified: res.sources.length < 2 });

step("5 narration, captions and timeline");
const composition = await generateNarration(final, dir, { format: videoFormat });
save("composition.json", {
  format: composition.format,
  width: composition.width,
  height: composition.height,
  fps: composition.fps,
  durationInFrames: composition.durationInFrames,
  durationSeconds: composition.durationSeconds,
  audioFile: basename(composition.audioPath),
  scenes: composition.scenes,
  words: composition.words,
  subtitles: composition.subtitles,
});

step("6 Remotion render");
const videoPath = join(dir, "out.mp4");
const thumbnailPath = join(dir, "thumbnail.png");
await renderVideo({ composition, outputPath: videoPath, thumbnailPath });

const tokens = costLedger.reduce((a, c) => ({ i: a.i + c.inTokens, o: a.o + c.outTokens }), { i: 0, o: 0 });
save("report.json", { topic, duration, level, format, seconds: (Date.now() - t0) / 1000, tokens, calls: costLedger, outputs: ["script-final.json", "composition.json", basename(composition.audioPath), "captions.srt", "thumbnail.png", "out.mp4"] });

console.log(`\n=== ${final.title} (${words} words, target ~${Math.round(duration * 2.5)}) ===`);
for (const s of final.sentences) console.log(`[${s.role}] ${s.text}`);
console.log("\nClaims:", fc.claims.map((c) => c.status).join(", "));
console.log("Sources:\n" + res.sources.map((s) => ` - ${s.title}`).join("\n"));
console.log(`\nTokens in/out: ${tokens.i}/${tokens.o}. Video: ${videoPath}. Thumbnail: ${thumbnailPath}. Saved to ${dir}`);
