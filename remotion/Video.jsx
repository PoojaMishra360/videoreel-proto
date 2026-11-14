import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

const palettes = [
  { background: "#122b2b", accent: "#a6e2ae", accent2: "#f1cb73", ink: "#173331" },
  { background: "#172b50", accent: "#9cc8ff", accent2: "#ffc28f", ink: "#172b50" },
  { background: "#37244f", accent: "#e7b6ff", accent2: "#f5d276", ink: "#36234d" },
  { background: "#193849", accent: "#89dddc", accent2: "#f2a28a", ink: "#173746" },
];

function CaptionTrack({ scenes, subtitles, words }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const cue = subtitles.find((item) => time >= item.start && time <= item.end);
  if (!cue) return null;
  const activeWord = words.find((word) => time >= word.start && time <= word.end);
  const lines = cue.text.split(/\s+/);
  let nearest = 0;
  if (activeWord) {
    const matching = lines.findIndex((line) => line.replace(/[.,!?;:]$/, "") === activeWord.text.replace(/[.,!?;:]$/, ""));
    nearest = matching < 0 ? 0 : matching;
  }
  return (
    <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "12%", display: "flex", justifyContent: "center", zIndex: 5 }}>
      <div style={{ maxWidth: "100%", padding: "18px 24px", borderRadius: 16, background: "rgba(13, 17, 34, .82)", color: "white", fontFamily: "Arial, sans-serif", fontSize: 45, fontWeight: 800, lineHeight: 1.18, textAlign: "center", boxShadow: "0 12px 35px rgba(0,0,0,.24)" }}>
        {lines.map((word, index) => <span key={`${word}-${index}`} style={{ color: index === nearest && activeWord ? "#ffd36a" : "#fff" }}>{word}{index < lines.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
}

function SceneFrame({ scene, index }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = palettes[scene.visualVariant % palettes.length];
  const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 85, mass: 0.8 } });
  const orbScale = interpolate(frame, [0, Math.max(1, fps * 2)], [0.72, 1.06], { extrapolateRight: "clamp" });
  const orbit = frame * 0.25;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: `radial-gradient(circle at 75% 23%, ${colors.accent}55, transparent 26%), linear-gradient(145deg, ${colors.background}, #11182a 78%)`, color: "white", fontFamily: "Arial, sans-serif" }}>
      <div style={{ position: "absolute", top: "10%", left: "8%", color: "rgba(255,255,255,.62)", fontSize: 20, fontWeight: 700, letterSpacing: 4 }}>VIDEOREEL  /  EXPLAINED</div>
      <div style={{ position: "absolute", top: "18%", right: "8%", border: `2px solid ${colors.accent}66`, width: 410, height: 410, borderRadius: "50%", transform: `rotate(${orbit}deg) scale(${orbScale})` }} />
      <div style={{ position: "absolute", top: "20%", right: "12%", width: 290, height: 290, borderRadius: "50%", background: `radial-gradient(circle at 35% 32%, #fff8, ${colors.accent} 54%, ${colors.accent2})`, boxShadow: `0 0 90px ${colors.accent}55`, transform: `scale(${orbScale})` }} />
      <div style={{ position: "absolute", top: "43%", left: "12%", width: "76%", height: 240, borderRadius: 34, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", backdropFilter: "blur(12px)", transform: `translateY(${(1 - entrance) * 55}px)`, padding: 28, boxSizing: "border-box" }}>
        <div style={{ color: colors.accent, fontSize: 20, fontWeight: 800, letterSpacing: 3, marginBottom: 22 }}>SCENE {String(index + 1).padStart(2, "0")}</div>
        <div style={{ fontSize: 31, lineHeight: 1.25, fontWeight: 700, color: "rgba(255,255,255,.94)" }}>{scene.narration}</div>
      </div>
      <div style={{ position: "absolute", bottom: "22%", right: "12%", width: 140, height: 140, borderRadius: 26, background: colors.accent2, opacity: 0.9, transform: `rotate(${frame * 0.12 + 12}deg) scale(${entrance})`, boxShadow: `0 20px 60px ${colors.accent2}44` }} />
      <div style={{ position: "absolute", left: "8%", top: "78%", color: "rgba(255,255,255,.7)", fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>ONE IDEA AT A TIME</div>
    </AbsoluteFill>
  );
}

function VideoReelComposition({ scenes, subtitles, words, audioFile }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#11182a" }}>
      {scenes.map((scene, index) => (
        <Sequence key={scene.id} from={scene.startFrame} durationInFrames={scene.durationInFrames}>
          <SceneFrame scene={scene} index={index} />
        </Sequence>
      ))}
      <Audio src={staticFile(audioFile)} />
      <CaptionTrack scenes={scenes} subtitles={subtitles} words={words} />
    </AbsoluteFill>
  );
}

export function VideoReelRoot() {
  const defaultProps = { scenes: [], subtitles: [], words: [], audioFile: "narration.mp3", width: 1080, height: 1920, fps: 30, durationInFrames: 300 };
  return <Composition id="VideoReel" component={VideoReelComposition} durationInFrames={300} fps={30} width={1080} height={1920} defaultProps={defaultProps} calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames, fps: props.fps, width: props.width, height: props.height })} />;
}
