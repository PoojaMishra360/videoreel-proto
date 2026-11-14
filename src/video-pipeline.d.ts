export type TimedWord = { text: string; start: number; end: number };
export type AlignedWord = TimedWord & { characterStart: number };
export type CaptionCue = { index: number; start: number; end: number; text: string };
export type VideoScene = {
  id: string;
  role: string;
  title: string;
  narration: string;
  startFrame: number;
  durationInFrames: number;
  words: { text: string; startFrame: number; endFrame: number }[];
  visualVariant: number;
};
export type VideoComposition = {
  audioPath: string;
  format: "9:16" | "1:1" | "16:9";
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  durationSeconds: number;
  scenes: VideoScene[];
  words: TimedWord[];
  subtitles: CaptionCue[];
};
export function wordsFromAlignment(alignment: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): TimedWord[];
export function alignWordCharacters(text: string, words: TimedWord[]): AlignedWord[];
export function sentenceScenes(sentences: { text: string; role: string }[], words: AlignedWord[], fps: number, durationInFrames: number): VideoScene[];
export function captionCues(words: TimedWord[], maxWords?: number): CaptionCue[];
export function generateNarration(
  script: { sentences: { text: string; role: string }[] },
  outputDir: string,
  options?: { voiceId?: string; format?: "9:16" | "1:1" | "16:9" },
): Promise<VideoComposition>;
