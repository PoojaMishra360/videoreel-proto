import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { cpus } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function renderVideo({ composition, outputPath, thumbnailPath }) {
  const entryPoint = resolve("remotion/index.jsx");
  const audioFile = basename(composition.audioPath);
  const publicDir = dirname(resolve(composition.audioPath));
  const inputProps = {
    scenes: composition.scenes,
    subtitles: composition.subtitles,
    words: composition.words,
    audioFile,
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    durationInFrames: composition.durationInFrames,
  };
  const serveUrl = await bundle({ entryPoint, publicDir });
  const selected = await selectComposition({ serveUrl, id: "VideoReel", inputProps });
  await renderMedia({
    composition: selected,
    serveUrl,
    codec: "h264",
    outputLocation: resolve(outputPath),
    inputProps,
    concurrency: Math.max(1, Math.min(4, cpus().length - 1)),
    crf: 20,
    pixelFormat: "yuv420p",
  });
  if (thumbnailPath) {
    await renderStill({
      composition: selected,
      serveUrl,
      output: resolve(thumbnailPath),
      frame: Math.min(composition.fps, composition.durationInFrames - 1),
      inputProps,
    });
  }
  return resolve(outputPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.error("Use the main generator to render a video from a fact-checked script.");
  process.exitCode = 1;
}
