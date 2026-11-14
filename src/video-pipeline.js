import "dotenv/config";
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function wordsFromAlignment(alignment) {
  const characters = alignment?.characters;
  const starts = alignment?.character_start_times_seconds;
  const ends = alignment?.character_end_times_seconds;
  if (!Array.isArray(characters) || !Array.isArray(starts) || !Array.isArray(ends) || characters.length !== starts.length || characters.length !== ends.length) {
    throw new Error("ElevenLabs did not return usable word alignment data.");
  }

  const words = [];
  let current = null;
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (/\s/.test(character)) {
      if (current) words.push(current);
      current = null;
      continue;
    }
    if (!current) current = { text: "", start: Number(starts[index]), end: Number(ends[index]) };
    current.text += character;
    current.end = Number(ends[index]);
  }
  if (current) words.push(current);
  return words.filter((word) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end) && word.end >= word.start);
}

export function alignWordCharacters(text, words) {
  let cursor = 0;
  return words.map((word) => {
    const characterStart = text.indexOf(word.text, cursor);
    const resolvedStart = characterStart < 0 ? cursor : characterStart;
    cursor = resolvedStart + word.text.length;
    return { ...word, characterStart: resolvedStart };
  });
}

export function sentenceScenes(sentences, words, fps, durationInFrames) {
  const joined = sentences.map((sentence) => sentence.text).join(" ");
  const sentenceStarts = [];
  let cursor = 0;
  for (const sentence of sentences) {
    sentenceStarts.push(cursor);
    cursor += sentence.text.length + 1;
  }

  let wordCursor = 0;
  const scenes = sentences.map((sentence, index) => {
    const startCharacter = sentenceStarts[index];
    const endCharacter = startCharacter + sentence.text.length;
    const sceneWords = [];
    while (wordCursor < words.length && words[wordCursor].characterStart < endCharacter) {
      if (words[wordCursor].characterStart >= startCharacter) sceneWords.push(words[wordCursor]);
      wordCursor += 1;
    }
    if (!sceneWords.length) {
      const fallbackWords = sentence.text.trim().split(/\s+/).length;
      sceneWords.push(...words.slice(Math.max(0, wordCursor - fallbackWords), wordCursor));
    }
    const startFrame = Math.max(0, Math.floor((sceneWords[0]?.start ?? 0) * fps));
    const nextSceneStart = sentences[index + 1]
      ? Math.max(startFrame + 1, Math.floor((words.find((word) => word.characterStart >= sentenceStarts[index + 1])?.start ?? durationInFrames / fps) * fps))
      : durationInFrames;
    const endFrame = Math.min(durationInFrames, Math.max(startFrame + 1, nextSceneStart));
    return {
      id: `scene-${index + 1}`,
      role: sentence.role,
      title: sentence.text.trim().split(/\s+/).slice(0, 6).join(" ").replace(/[.!?]+$/, ""),
      narration: sentence.text,
      startFrame,
      durationInFrames: endFrame - startFrame,
      words: sceneWords.map(({ text, start, end }) => ({ text, startFrame: Math.floor(start * fps), endFrame: Math.max(Math.floor(start * fps) + 1, Math.ceil(end * fps)) })),
      visualVariant: index % 4,
    };
  });

  if (!joined.trim() || scenes.some((scene) => !scene.durationInFrames)) throw new Error("Could not build a valid scene timeline from the script.");
  return scenes;
}

export function captionCues(words, maxWords = 6) {
  const cues = [];
  let group = [];
  for (const word of words) {
    group.push(word);
    if (group.length >= maxWords || /[.!?]$/.test(word.text)) {
      cues.push(group);
      group = [];
    }
  }
  if (group.length) cues.push(group);
  return cues.map((cue, index) => ({
    index: index + 1,
    start: cue[0].start,
    end: cue[cue.length - 1].end,
    text: cue.map((word) => word.text).join(" "),
  }));
}

function toSrtTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((milliseconds % 60_000) / 1000);
  const remainder = milliseconds % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")},${String(remainder).padStart(3, "0")}`;
}

function localNarration(text, outputPath) {
  if (process.platform !== "win32") throw new Error("VOICE_PROVIDER=system is currently supported on Windows only.");
  const scriptPath = fileURLToPath(new URL("./local-voice.ps1", import.meta.url));
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
    input: JSON.stringify({ text, outputPath }),
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error("Windows local speech synthesis failed.");
  let words;
  try {
    words = JSON.parse(result.stdout).words;
  } catch {
    throw new Error("Windows local speech synthesis returned invalid word timings.");
  }
  const metadata = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", outputPath], { encoding: "utf8" }));
  const duration = Number(metadata.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0 || !Array.isArray(words) || !words.length) {
    throw new Error("Windows local speech synthesis produced no measurable audio or word timings.");
  }
  words[words.length - 1].end = duration;
  return { words, duration };
}

export async function generateNarration(script, outputDir, { voiceId = process.env.ELEVENLABS_VOICE_ID, format = "9:16", voiceProvider = process.env.VOICE_PROVIDER?.trim().toLowerCase() || "elevenlabs" } = {}) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (voiceProvider !== "elevenlabs" && voiceProvider !== "system") throw new Error("VOICE_PROVIDER must be either elevenlabs or system.");
  if (voiceProvider === "elevenlabs" && (!apiKey || !voiceId)) throw new Error("Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in .env to generate narration.");
  const dimensions = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] }[format];
  if (!dimensions) throw new Error("Format must be one of 9:16, 1:1, or 16:9.");
  const text = script.sentences.map((sentence) => sentence.text.trim()).join(" ");
  let rawWords;
  let audioPath;
  let audioDuration;
  if (voiceProvider === "system") {
    audioPath = join(outputDir, "narration.wav");
    const local = localNarration(text, audioPath);
    rawWords = local.words;
    audioDuration = local.duration;
  } else {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) throw new Error(`ElevenLabs narration failed with HTTP ${response.status}. Set VOICE_PROVIDER=system to use local Windows speech.`);
    const result = await response.json();
    if (!result.audio_base64) throw new Error("ElevenLabs returned no narration audio.");
    rawWords = wordsFromAlignment(result.alignment ?? result.normalized_alignment);
    audioPath = join(outputDir, "narration.mp3");
    writeFileSync(audioPath, Buffer.from(result.audio_base64, "base64"));
    audioDuration = Math.max(...rawWords.map((word) => word.end), 0);
  }
  const alignedWords = alignWordCharacters(text, rawWords);
  const fps = 30;
  const durationInFrames = Math.ceil((audioDuration + 0.35) * fps);
  const scenes = sentenceScenes(script.sentences, alignedWords, fps, durationInFrames);
  const subtitles = captionCues(alignedWords);
  const srt = subtitles.map((cue) => `${cue.index}\n${toSrtTime(cue.start)} --> ${toSrtTime(cue.end)}\n${cue.text}`).join("\n\n");
  writeFileSync(join(outputDir, "captions.srt"), `${srt}\n`, "utf8");
  return {
    audioPath,
    voiceProvider,
    words: alignedWords.map(({ text: word, start, end }) => ({ text: word, start, end })),
    subtitles,
    scenes,
    fps,
    durationInFrames,
    durationSeconds: durationInFrames / fps,
    format,
    width: dimensions[0],
    height: dimensions[1],
  };
}
