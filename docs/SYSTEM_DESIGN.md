# VideoReel.ai — System Design (v1.0)

Source of truth for requirements: `PRD.md` v1.2. Pipeline detail: `PIPELINE_DESIGN_AND_PROTOTYPE_PLAN.md`. AI detail: `AI_DOCUMENTATION.md`. Data: `DATABASE_DESIGN.md`.

## 1. Decisions locked
| Area | Decision |
|---|---|
| Languages | English, Hindi, and more Indian languages (per-project `language`) |
| Database | MongoDB Atlas; isolation enforced in API layer |
| Instagram | 1 account per user, all plans incl. Free (rate-limited per plan) |
| Rendering | Self-hosted render workers + BullMQ/Redis queue; Remotion Lambda is a later upgrade |
| Core AI | Gemini (text, images), ElevenLabs (voice + word timestamps), Tavily (research), Remotion (motion graphics/render) |
| LLM resilience | Provider abstraction: Gemini primary, OpenAI/Groq fallback (prototype already supports OpenAI) |

## 2. High-level architecture
```
Browser (Next.js app)
   │ HTTPS
   ▼
API (Node/TypeScript, Fastify or Next route handlers)
   │  ├── Auth (JWT sessions, Google login)
   │  ├── Credits/billing (Razorpay + Stripe)
   │  └── enqueue job ──► Redis (BullMQ)
   ▼
MongoDB Atlas  ◄──────────────  Workers
Object storage (S3/R2) ◄──────  ├── Pipeline worker (stages 0–6: LLM, research, images, voice)
                                ├── Render worker (Remotion + FFmpeg)
                                └── Publisher worker (Instagram scheduling)
Realtime progress: SSE from API (job state from Redis/Mongo)
```

## 3. Components
1. **Web app (Next.js + React + Tailwind).** Landing, auth, dashboard, "new video" (one input), progress screen, editor (captions, scenes, voice, format), export, Instagram connect/schedule, billing.
2. **API service.** Stateless REST. Validates input (zod), checks plan and credits, scopes every query by `userId`, creates a `generation_jobs` doc, enqueues.
3. **Pipeline worker.** Runs stages 0–7 (moderation → intake → research → script → fact-check → storyboard → asset generation → voice). Each stage writes its output to Mongo + object storage so a failed run **resumes from the last good stage**.
4. **Render worker.** Remotion bundle renders `composition.json` → MP4 (9:16, 1:1, 16:9). FFmpeg for audio mix, ducking, compression. Concurrency limited per CPU core.
5. **Publisher worker.** Cron-like scheduler (BullMQ delayed jobs): uploads reel to Instagram Graph API, retries, records status.
6. **Storage.** S3-compatible (Cloudflare R2 recommended: no egress fees). Signed URLs only; objects keyed `users/{userId}/projects/{projectId}/…`.
7. **Redis.** Queue + rate limiting + short-lived progress cache.

## 4. Generation flow (one click)
1. User submits topic, language, duration, format, level. API checks credits, reserves them (ledger `hold`), creates job.
2. Pipeline worker executes stages, emitting `stage_started/completed` events (stored on job, streamed via SSE).
3. Assets (images, audio) saved to storage; `composition.json` saved on the project.
4. Render job queued; worker produces preview (720p) then final MP4.
5. Credits `hold` converted to `charge` on success; released on failure.
6. User previews, edits (edits re-render only what changed), exports, or schedules to Instagram.

## 5. Multi-user isolation
- Every collection holds `userId` (and optional `workspaceId` for Team plan later).
- A single data-access layer requires a `userId` argument; no raw collection access from route handlers.
- Storage keys are namespaced by `userId`; downloads use short-lived signed URLs.
- Instagram tokens are per-user, encrypted at rest (AES-256-GCM, key in secrets manager), never returned to the client.
- Automated tests: user A must get 404 for every user B resource.

## 6. Instagram integration
- Instagram Graph API (Business/Creator account linked to a Facebook Page). OAuth per user; long-lived token refresh job.
- Publish flow: create media container (REELS) → poll status → `media_publish`. Scheduling is ours (delayed BullMQ job).
- **Critical path:** Meta developer account, business verification, and App Review for `instagram_content_publish`. Start early; it takes weeks.
- Free-plan limits: e.g. 3 scheduled posts/week (configurable).

## 7. Languages (Indian languages)
- `language` field on project drives: research queries, script language, TTS voice/model, caption font.
- ElevenLabs `eleven_multilingual_v2`/v3 for Hindi and other supported languages; Gemini for script. Unsupported language → blocked with a clear message.
- Captions use Noto Sans families (Devanagari, Tamil, Bengali, etc.), shaping verified in Remotion.
- Word timestamps from ElevenLabs drive caption timing; fallback: forced alignment.
- Quality gate: native-speaker review of Hindi output before launching each language.

## 8. Non-functional targets
| Item | Target |
|---|---|
| 60s video end-to-end | ≤ 5 min p50, ≤ 10 min p95 |
| COGS per 60s video | ≤ $0.50 |
| Pipeline success rate | ≥ 95% |
| Availability | 99.5% for app/API |
| Concurrency (V1) | 5 pipeline + 2 render jobs per worker box |
| Data | Backups daily (Atlas), assets retained 90 days on Free |

## 9. Security & compliance
- Secrets in env/secret manager only; none in repo. (Keys pasted in chat earlier must be rotated.)
- Input moderation (stage 0) + prompt-injection guard (topic is data, never instructions).
- Rate limits per user/IP; credit checks server-side.
- Content: AI-generated disclosure label option; copyright-safe assets only; music from licensed library.
- Privacy: DPDP Act (India) + GDPR basics: export/delete account.
- Licensing to verify before launch: Remotion company license, ElevenLabs commercial tier (free tier forbids commercial use), Gemini image terms.

## 10. Deployment
- **V1:** Web + API on Vercel/Railway; workers on a VM (Hetzner/AWS, 4–8 vCPU) via Docker; MongoDB Atlas; Upstash/Redis; R2 storage; Sentry + Better Stack logs.
- **Scale path:** more worker boxes → Remotion Lambda for burst renders → split pipeline stages into separate queues.

## 11. Observability
- Per-job trace: stage durations, tokens, provider, cost (stored in `generation_jobs.stages[]`).
- Dashboards: success rate, p95 latency, cost/video, failure by stage/provider.
- Alerts: queue depth, provider error rate (429/503), render failures, Instagram token expiry.

## 12. Failure handling
| Failure | Handling |
|---|---|
| LLM 429/503 | Backoff → fallback model → fallback provider |
| Image blocked/bad | Re-prompt once, then template fallback (text/diagram scene) |
| TTS fails | Retry → alternate voice/provider |
| Render crash | Retry once, then mark failed, release credits |
| Instagram error | Retry 3×, notify user, keep MP4 downloadable |

## 13. Build plan
1. Finish prototype (Days 2–5) → go/no-go.
2. App skeleton: auth, Mongo models, storage, queue.
3. Port pipeline into worker; SSE progress.
4. Editor + export; billing/credits.
5. Instagram connect/schedule; beta with 20 educators.

## 14. Open items
- Pick LLM fallback provider for production (Gemini paid tier recommended for reliability).
- Hosting provider and budget; domain registration (videoreel.ai/.io).
- Payment gateway (Razorpay for India, Stripe for international).
- Meta app review timeline owner.
