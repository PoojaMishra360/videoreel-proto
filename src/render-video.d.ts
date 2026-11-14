import type { VideoComposition } from "./video-pipeline.js";

export function renderVideo(options: { composition: VideoComposition; outputPath: string; thumbnailPath?: string }): Promise<string>;
