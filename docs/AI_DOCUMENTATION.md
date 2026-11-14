# VideoReel.ai — AI Documentation (v1.0)

How the AI pipeline works: stages, models, prompts, contracts, fallbacks, cost. Implemented so far in `videoreel-proto` (stages 0–4).

## 1. Principles
1. **Structured outputs.** Every LLM stage returns JSON validated by zod; invalid → up to 3 repair retries.
2. **Topic is data.** User input is wrapped and never treated as instructions (prompt-injection guard).
3. **Grounded facts.** Claims come from researched sources; fact-check stage flags unsupported claims.
4. **Resumable.** Each stage output is persisted; a rerun skips completed stages.
5. **Provider-agnostic.** One `llm` interface; models swappable by env.
6. **Language-aware.** `language` passes through every stage (English, Hindi, other Indian languages).

## 2. Stage map
| # | Stage | Tool/Model | Output |
|---|---|---|---|
| 0 | Moderation | LLM (flash/mini) | `{allowed, reason}` |
| 1 | Intake | LLM | Brief: audience, level, goal, key questions, language |
| 2 | Research | Tavily search → LLM summary (Gemini grounding fallback) | Facts + sources |
| 3 | Script | LLM | Narration by scene, word-budgeted |
| 4 | Fact-check | LLM vs sources | Claims: supported / unsupported |
| 5 | Storyboard | LLM | Scenes: visual_type, on-screen text, image prompts, template + props |
| 6 | Style guide | LLM | Palette, fonts, illustration style (consistent across scenes) |
| 7 | Visuals | Animated Remotion motion-graphic scenes derived from the script | Rendered scene cards (AI image assets not yet connected) |
| 8 | Voice-over | ElevenLabs `with-timestamps`, or Windows `System.Speech` when `VOICE_PROVIDER=system` | Narration MP3/WAV + word-level alignment |
| 9 | Timeline and captions | Deterministic code | `composition.json` + burned-in word-highlight captions + SRT |
| 10 | Render | Remotion + local FFmpeg | H.264 MP4 (9:16, 1:1, 16:9) |
| 11 | QA | Local render smoke test and ffprobe | File output and duration check; full visual/audio QA remains pending |

Stages 0–4 remain the existing LLM pipeline. The CLI now connects the fact-checked script to a single timestamped narration, sentence-based motion scenes, word-highlight captions, an SRT sidecar, a PNG thumbnail, and a Remotion MP4 render. Set `LLM_PROVIDER=gemini` to select Gemini explicitly; set `VOICE_PROVIDER=system` for local Windows speech. AI-generated scene images, licensed music, and the full QA agent are not connected yet. The local smoke checks exercise voice alignment and rendering without paid provider calls.

## 3. Stage details
### 0 Moderation
Block: hate, sexual content, self-harm instructions, medical/legal advice presented as certain, minors-targeted unsafe content. Returns reason shown to the user. Cheap model.

### 1 Intake
Infers audience level (beginner/intermediate/advanced), tone, 3–5 key questions the video must answer. User overrides allowed. Never asks the user questions in one-click mode.

### 2 Research
Tavily `POST /search` (advanced depth, ~6 results) → LLM extracts facts with source URLs. If Tavily fails, Gemini Google Search grounding. For Indian languages, research in English, then script in target language.

### 3 Script
Word budget = duration (s) × 2.5 (English) — tuned per language (Hindi ≈ 2.2). Structure: hook (≤5s) → 3–5 teaching beats → recap/CTA. One idea per scene, plain language, no unverifiable stats.

### 4 Fact-check
Each factual claim is matched to a source. Unsupported claims are rewritten or removed, then re-checked. Output stored in `report.json`.

### 5 Storyboard
Per scene: `narration`, `visual_type` (illustration | diagram | stat | quote | list | animated-text), `onScreenText`, `imagePrompt`, `template`, `durationHint`. Templates (6): title card, illustration+caption, diagram/steps, big stat, comparison, recap.

### 7 Images
One consistent style guide in every prompt. Safety: no real people/logos. Failure → one re-prompt → text/diagram template fallback. Hindi/Indic text is **never** rendered inside AI images (done in Remotion with real fonts).

### 8 Voice-over
ElevenLabs with chosen voice id; request word-level timestamps for caption sync. Per-scene generation enables partial regeneration. Fallback: Azure TTS.

### 9 Timeline
Deterministic: scene duration = audio duration + padding; captions from word timestamps; music ducking; format-specific layout (9:16 / 1:1 / 16:9).

### 11 QA
Checks: duration within ±10% of target, every scene has audio+visual, caption within safe area, loudness ≈ −16 LUFS, no black frames. Auto-fix when possible, else flag.

## 4. Prompting conventions
- System prompt = role + rules + JSON schema; user prompt = delimited data (`<topic>…</topic>`).
- Temperature low (0.2–0.4) for structure; 0.7 for script creativity.
- Language directive at top: "Write all narration in {language}."
- Few-shot only for storyboard.
- Prompts are versioned in `prompts/` with a `promptVersion` saved per job for debugging.

## 5. Model routing & fallbacks
| Need | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| Text/JSON | Gemini flash (3.8) | Gemini 3.7/3.5 flash | OpenAI gpt-4o-mini / Groq Llama |
| Research | Tavily | Gemini grounding | — |
| Images | Gemini image | alternate image model | template-only scene |
| Voice | ElevenLabs | Azure TTS | Gemini TTS |

Findings from the prototype: the Gemini free tier is unreliable (≈20 requests/day/model, frequent 503). Production must use paid Gemini and/or a second provider. OpenAI API requires prepaid credit.

## 6. Cost model (per 60s video, estimate)
| Item | Est. |
|---|---|
| LLM (all stages, ~10–15k tokens) | $0.01–0.05 |
| Research (Tavily) | ~$0.01 |
| Images (6–8) | $0.10–0.30 |
| Voice (~150 words ≈ 900 chars) | $0.10–0.20 |
| Render compute | $0.02–0.05 |
| **Total** | **≈ $0.25–0.60** (target ≤ $0.50) |

Cost is logged per stage in `generation_jobs.stages[].cost`.

## 7. Safety & quality
- Source-backed claims only; sources listed in export description option.
- Educational disclaimer on health/finance topics.
- Image safety filters; no real-person likeness.
- Human review sample (5% of videos) during beta.
- Hindi/Indic: native-speaker QA before each language is enabled.

## 8. Evaluation (prototype Day 5)
Test topics: photosynthesis, compound interest, vaccines. Metrics: educator rating ≥ 4/5, factual errors = 0 critical, time ≤ 10 min, cost ≤ $0.60, success ≥ 90% over 10 runs. Go/no-go in `PROTOTYPE_REPORT.md`.

## 9. Open items
- Choose production LLM fallback; decide Hindi voice selection.
- Pick image model by quality/cost bake-off.
- Forced-alignment fallback if timestamps are unavailable for a language.
