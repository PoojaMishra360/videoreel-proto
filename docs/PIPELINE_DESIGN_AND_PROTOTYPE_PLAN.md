# VideoReel: Pipeline Technical Design and Prototype Plan

Version 1.0 | Companion to PRD v1.2 | Scope: week-1 CLI prototype plus the pipeline design it validates

---

## 1. Purpose and goals
Prove, before building the app, that **topic in, finished educational MP4 out** is good enough, cheap enough and fast enough.

**Prototype questions to answer**
| Question | Pass bar |
|---|---|
| Is the video watchable and clear? | Blind rating of 4/5 or better from 5 educators |
| Are the facts right? | Under 5% of claims wrong (manual audit of 3 videos) |
| Is the cost viable? | COGS at or below $0.50 per 60s video |
| Is it fast enough? | At most 5 min end to end for a 60s video |
| Is the sync good? | Captions and visuals within 150 ms of audio, no visible drift |
| Are the visuals consistent? | Same style and palette across scenes, with no garbled text |

**Out of prototype scope:** UI, auth, billing, multi-user, Instagram, editor, queues. These stay in the MVP.

---

## 2. Pipeline overview

```
topic + options
   |
[0 Moderation] -> [1 Intake] -> [2 Research] -> [3 Script] -> [4 Fact-check]
   -> [5 Storyboard] -> [6 Style guide]
   -> fan-out per scene: [7a Image] [7b Diagram/Template] [7c Voice]
   -> [8 Timeline composer] -> [9 Remotion render] -> [10 QA] -> MP4 + SRT + thumbnail
```

Every stage is a pure function: `(typed input, config) -> typed output + cost + timing`. Output is written to disk (prototype) or Postgres/R2 (MVP), so a stage can be re-run or resumed without redoing earlier stages.

---

## 3. Stage specifications

### 3.0 Moderation
- Input: topic and context. Output: `{allowed, category}`. Tool: OpenAI Moderation API (free) or a Gemini safety check.
- On block: stop, charge nothing.

### 3.1 Intake
- Input: raw topic, level, duration, language, tone.
- Output `Brief`: `{angle, learning_objectives[3], key_terms[], audience, word_budget, scene_target}`.
- Narrows vague topics, and splits overly broad ones into a focused angle.
- Word budget: duration x 2.5 words per second (about 150 wpm). A 60s video is about 150 words.

### 3.2 Research
- Gemini with Google Search grounding first. Tavily for extra sources, and Wikipedia for definitions.
- Output `Facts[]`: `{claim, source_url, source_title, confidence}`, with 3 to 8 sources.
- Drop low-reliability domains. If fewer than 2 sources are found, set `unverified=true`.

### 3.3 Script
- Structure: hook (about 5s), 2 to 4 key points, one concrete example, recap, CTA.
- Constraints: use only the provided facts, grade-level vocabulary, short sentences written for the ear, and a word count within +/-10% of the budget.
- Output: script text plus a per-sentence list tagged with the supporting fact IDs.

### 3.4 Fact-check
- A second LLM call, ideally a different model or prompt, compares each sentence to the sources.
- Output: `claims[] {text, status: supported|uncertain|removed}`. Unsupported claims are removed or softened ("often", "about"), then the script is re-checked against the word budget.

### 3.5 Storyboard
- Splits the script into scenes (30s: 5 to 8, 60s: 6 to 12, 90s: 8 to 15), each 3 to 10 s.
- Scene JSON: `{idx, narration, on_screen_text (max 8 words), visual_type: image|diagram|motion_template|text_card, image_prompt | template_id + props | mermaid/svg_spec}`.
- Rule: at least 40% of scenes must be diagrams or templates, because they are more accurate and consistent than AI images.
- Validated against a JSON schema, with up to 2 repair retries.

### 3.6 Style guide
- Generated once per project from the style preset: palette (hex), art style sentence, character and object descriptors, negative prompt, and a seed.
- It is injected into every image prompt to keep scenes consistent.

### 3.7 Asset generation (parallel per scene)
- **7a Image:** Gemini/Imagen with the style guide. Text is never baked into images (Remotion draws text). On a safety refusal, rewrite the prompt more neutrally, then fall back to a text card.
- **7b Diagram/template:** the LLM emits template props (see section 5) or Mermaid/SVG, which is validated by rendering. On failure, fall back to a text card.
- **7c Voice:** ElevenLabs per scene with word-level timestamps. A fixed voice ID, stability and style settings, and a pronunciation dictionary for key terms. Concatenating per-scene audio makes regeneration of one scene cheap. Use `previous_text`/`next_text` context where supported, to keep prosody natural across scenes.
- Fallback: Azure Neural TTS (word boundaries), then faster-whisper alignment if timestamps are missing.

### 3.8 Timeline composer
- Scene duration = audio duration + 0.3s padding. Total timeline = sum of scenes plus intro and outro bumpers.
- Output `composition.json` (the single source of truth for preview and render):
```json
{
  "format": "9:16", "fps": 30, "width": 1080, "height": 1920,
  "scenes": [{
    "id": "s1", "start_ms": 0, "duration_ms": 6200,
    "visual": {"type": "image", "src": "assets/s1.png", "motion": "ken_burns_in"},
    "template": null,
    "onScreenText": {"text": "...", "anim": "fade_up"},
    "transition": "crossfade"
  }],
  "audio": {"voice": "voice.wav", "music": {"src": "m1.mp3", "volume": 0.12, "duck": true}},
  "captions": {"style": "bold_highlight", "words": [{"w": "Plants", "s": 120, "e": 480}]}
}
```
- Checks: total length within the target +/-15%, no gaps, and every asset present.

### 3.9 Render (Remotion plus FFmpeg)
- One Remotion composition parameterized by `composition.json` and `format`. Layouts use safe areas per aspect ratio (9:16, 1:1, 16:9).
- Scene components: `ImageScene`, `DiagramScene`, `TemplateScene`, `TextCard`, `Captions`, `Watermark`, `Intro/Outro`.
- Music is ducked under voice. Output is H.264 and AAC MP4, plus an SRT and a thumbnail.
- Prototype: local `npx remotion render`. MVP: Remotion Lambda or containers.

### 3.10 QA
- Automated checks: audio duration vs video duration, no blank frames (sample frames), caption overflow, loudness (target around -16 LUFS), and file playable.
- Output: pass or fail report. Retry the failing stage once, otherwise flag it.

---

## 4. Data contracts (TypeScript, shared across stages)
```ts
type Brief = { angle: string; objectives: string[]; keyTerms: string[]; audience: string; wordBudget: number; sceneTarget: [number, number] };
type Fact = { id: string; claim: string; url: string; title: string; confidence: number };
type Scene = { idx: number; narration: string; onScreenText: string;
  visual: { type: 'image'|'diagram'|'motion_template'|'text_card'; prompt?: string; templateId?: string; props?: Record<string, unknown> };
  durationMs?: number; assets?: { image?: string; audio?: string } };
type StageResult<T> = { data: T; costUsd: number; ms: number; provider: string; model: string; promptVersion: string };
```
Validate every LLM output with Zod (or JSON schema) and use the model's structured-output mode.

---

## 5. Motion template library (prototype: 6, MVP: about 10)
| Template | Props |
|---|---|
| `title_card` | title, subtitle |
| `bullet_reveal` | heading, bullets[<=4] |
| `numbered_steps` | steps[<=5] |
| `comparison` | left{title,points}, right{title,points} |
| `definition_callout` | term, definition |
| `stat_counter` | value, label, unit |
| (MVP) `bar_chart`, `timeline`, `flow_diagram`, `quote_takeaway`, `outro_cta` | |

Every template has a props schema, safe areas per aspect ratio and animation presets.

---

## 6. Prototype architecture

**Language and layout:** TypeScript end to end (the Remotion pipeline and the LLM calls share types).
```
videoreel-proto/
  package.json
  .env                      # GEMINI_API_KEY, ELEVENLABS_API_KEY, TAVILY_API_KEY (never committed)
  src/
    cli.ts                  # videoreel "topic" --format 9:16 --duration 60 --level beginner
    pipeline.ts             # runs stages, writes runs/<id>/stage-N.json, resumable
    stages/                 # intake, research, script, factcheck, storyboard, style, assets, timeline, qa
    providers/              # llm.ts, image.ts, tts.ts, search.ts (interfaces plus gemini/elevenlabs/azure/tavily impls)
    cost.ts                 # per-call cost ledger
    schemas.ts              # Zod schemas
    prompts/                # versioned prompt files (v1/...)
  remotion/
    Root.tsx, Video.tsx, scenes/, templates/, Captions.tsx
  runs/<runId>/             # artifacts: json per stage, assets/, out.mp4, report.json
```
**Resumability:** `--resume <runId> --from storyboard` reuses saved stage outputs.
**Cost tracking:** every provider call appends `{stage, provider, units, costUsd}` to `report.json`.
**Provider interfaces** (swap without touching stages):
```ts
interface LLM { generate<T>(opts: {system: string; prompt: string; schema: ZodType<T>; grounding?: boolean}): Promise<StageResult<T>> }
interface TTS { synth(opts: {text: string; voice: string; prev?: string; next?: string}): Promise<StageResult<{audio: Buffer; words: Word[]}>> }
interface ImageGen { generate(opts: {prompt: string; style: StyleGuide; seed?: number; aspect: string}): Promise<StageResult<Buffer>> }
interface Search { query(q: string): Promise<StageResult<SearchHit[]>> }
```

---

## 7. Prototype plan (5 working days)

| Day | Work | Output |
|---|---|---|
| **1** | Repo, config, provider interfaces, Gemini and ElevenLabs clients, cost ledger. Stages 0 to 4 (moderation to fact-check) on 1 topic. | Script plus sources JSON, reviewed by a human |
| **2** | Storyboard, style guide, image generation, ElevenLabs voice with timestamps. Compare 2 to 3 voices. | Scene assets and `voice.wav` with word timings |
| **3** | Remotion project: scene components, 6 templates, captions, `composition.json` to MP4 in 9:16. | First end-to-end MP4 |
| **4** | Add 1:1 and 16:9, music ducking, QA checks, resume, and tidy the cost report. Run all 3 test topics. | 3 MP4s plus `report.json` each |
| **5** | Evaluation: blind rating by 5 educators, fact audit, cost and latency review, write-up and go/no-go. | `PROTOTYPE_REPORT.md` |

**Test topics (varied on purpose):** (1) "How does photosynthesis work?" (science, diagrams), (2) "What is compound interest?" (numbers, charts, finance disclaimer), (3) "How do vaccines train your immune system?" (health, accuracy and caution).
**Each topic is run in:** 60s 9:16 (all three), plus one 90s 16:9 run to check layouts.

**Setup needs:** Node 20+, FFmpeg, Gemini API key (AI Studio free tier), ElevenLabs key (free tier is enough for the test; a paid plan is required for commercial use), Tavily key (free), and optionally an Azure Speech key for the fallback comparison.

---

## 8. Evaluation plan
| Metric | How measured |
|---|---|
| Quality | 5 educators rate each video blind (1 to 5) on clarity, accuracy impression, visual appeal and voice. Include a competitor sample (for example, one InVideo or Pictory video) as a baseline. |
| Factual accuracy | Manually check every claim in 3 scripts against sources. Record the error rate. |
| Cost | Sum the per-call costs in `report.json`. Compare with the $0.50 target and extrapolate to a Creator plan margin. |
| Latency | Wall-clock per stage and in total. Identify the bottleneck (likely images or render). |
| Sync | Frame-step 10 caption and scene boundaries per video. |
| Consistency | Rate style consistency across scenes (1 to 5). Count garbled-text or artifact images. |
| Reliability | Run each topic 3 times and count failures and retries. |

**Go / No-go**
- **Go:** average at least 4/5, fact errors under 5%, COGS at most $0.50 (or a clear path to it), p90 time at most 5 min.
- **Adjust:** if one metric fails, fix the cause (see section 9) and re-run. Don't build the MVP on a failing metric.
- **No-go:** quality stays below 3.5/5 after two adjustment rounds.

---

## 9. Known risks and planned fixes
| Problem | Likely fix |
|---|---|
| Image style inconsistency | Tighter style guide, fixed seed or reference image, more templates and diagrams, flat vector style presets |
| Garbled text in images | Never request text in images, and render text in Remotion |
| Cost too high | Cheaper image model for drafts, fewer images (Ken Burns and templates reuse), Azure voice for the default tier, caching by content hash |
| ElevenLabs cost or rate limits | Character caps, Azure default tier, batch per scene |
| Hallucinations | Stricter "use only provided facts" prompt, fact-check by a second model, flag "unverified" |
| Slow render | Lower fps during draft, parallel scene rendering with Lambda, reuse compiled bundle |
| Sync drift | Drive all timing from audio word timestamps, not estimates |
| Remotion license | Confirm the license terms for your company size before launch |
| LLM JSON failures | Structured-output mode, Zod validation, repair retry, fallback model |

---

## 10. From prototype to MVP production pipeline

| Prototype | MVP |
|---|---|
| CLI script, local disk | API plus durable workflow engine (Inngest/Trigger.dev), Postgres, R2 |
| One run at a time | Queue with per-user concurrency and fair-share scheduling |
| Local Remotion render | Remotion Lambda or autoscaled containers |
| JSON files per stage | `jobs`, `job_events`, `scenes`, `assets` tables (PRD section 9) |
| Cost in `report.json` | `cost_usd` per job and per user, with credit reserve, commit and refund |
| No auth | Per-user isolation (RLS, namespaced storage) per PRD section 5.13 |
| Manual QA | Automated QA agent plus a watchdog (jobs stuck for over 15 min are failed and refunded) |

**MVP orchestration rules (carried over from the prototype)**
- Each step is idempotent and keyed by `(project_id, stage, input_hash)`.
- Retries: 3 attempts with exponential backoff. Errors are classified as retryable, fixable by prompt, or fatal.
- Per-stage and global (15 min) timeouts, with a cost cap per job.
- Prompts are versioned. Every job records its prompt version, models and seed for reproducibility.
- Provider circuit breakers, with a fallback provider per interface.
- Progress events stream to the client over SSE from stage transitions.

**Scene regeneration (editor)** re-runs only 7a/7b/7c for one scene and recomposes the timeline. Unchanged scenes are skipped via content hash. Only changed audio is re-synthesized.

---

## 11. Security and compliance in the pipeline
- API keys live in environment variables or a secret manager, never in code or logs.
- User text is treated as data. Prompts are isolated, outputs are schema-validated and output moderation runs on the script and images.
- Sensitive topics (health, finance) get a disclaimer scene and conservative wording.
- Only licensed music and fonts. No real-person likenesses. Video metadata carries an AI-generated label.
- Per-user storage namespacing and signed URLs are required from the first MVP commit.

---

## 12. Deliverables of this phase
1. `videoreel-proto` repo that runs `videoreel "<topic>"` and produces MP4, SRT, thumbnail and `report.json`.
2. 3 test videos in the 9:16 format, plus one 16:9 sample.
3. `PROTOTYPE_REPORT.md` with ratings, accuracy, cost, latency and a go/no-go.
4. Updated system design (the next document) that reflects the findings.

## 13. Decisions needed before Day 1
1. Do you have Gemini, ElevenLabs and Tavily keys (free tiers are fine)?
2. Prototype language: TypeScript (recommended, it shares code with Remotion) or Python for the AI stages?
3. Default voice style: male or female, and an Indian-English or neutral accent?
4. Which 5 educators can rate the videos?
