# PRD: VideoReel (videoreel.ai) – AI Video Generation Platform

Version 1.2 (Final draft) | Status: Ready for build planning

**Product naming and scope:** The brand is deliberately broad ("video"), so the platform can grow beyond education. **V1 launches focused on educational explainer videos** (the wedge), then expands to other video types (see §13).

**Assumptions (change if wrong):** V1 is English-only (Hindi in V1.1). Stack: Gemini (LLM, images), ElevenLabs (voice and timestamps), Remotion (render). Web app only. **Multi-user: every user (including your own team members) has a fully private account, dashboard, workspace, projects, credits and Instagram connection (see §5.13).** Instagram connect is per user and no accounts are ever shared. Automated posting and scheduling ship in V1.5 (the per-user connection and data model are designed in V1).

---

## 1. Product Vision
Turn any topic into a publish-ready educational explainer video in under 5 minutes, from one input and one click.

**Principles**
1. One input, one click. Everything else is optional.
2. Accuracy over flashiness. Every claim is source-grounded.
3. Mobile-first visuals, with captions on by default.
4. Fail gracefully. Never charge for a failed result.
5. Cost-aware. Every job tracks its own cost.

**Positioning:** Researched, accurate explainer videos with real educational visuals (diagrams, motion graphics), for educators and creators who can't edit video. Not an avatar tool and not a stock-footage slideshow.

**Non-goals (V1):** avatars or talking heads, voice cloning, full timeline editor, direct publishing, team workspaces, generative video clips, mobile apps.

---

## 2. Personas
| Persona | Goal | Pain | Success looks like |
|---|---|---|---|
| **Priya**, Instagram educator | 5+ Reels per week | No time or editing skills | Topic to Reel in 5 min |
| **Rahul**, course creator | Concept intros, lesson explainers | Freelancers are slow and costly | Consistent branded explainers |
| **Anna**, LinkedIn coach | Thought-leadership clips | Non-technical | Clean 1:1 or 9:16 videos |
| **Mr. Sharma**, teacher | Classroom explainers | Needs accuracy and simple language | Grade-appropriate, correct content |
| **Dev**, faceless YouTuber | Scale output | Production cost per video | Batch quality at low cost |

---

## 3. End-to-End User Flow

### 3.1 Primary flow (happy path)
1. Land on the marketing page, then sign up (Google or email).
2. Onboarding (max 3 questions, skippable): role, platform, language. This pre-fills defaults.
3. Dashboard shows an empty state with a big "Create video" box.
4. User types a topic, for example "How does photosynthesis work?".
5. Optional "Customize" drawer (collapsed by default):
   - Format: 9:16 (default), 1:1, 16:9
   - Duration: 30s, 60s (default), 90s
   - Audience level: Kids, Beginner (default), Intermediate, Expert
   - Voice: 3 curated defaults, with a preview button
   - Visual style: 4 presets (Flat illustration, Whiteboard, Dark tech, Playful)
   - Tone: Friendly, Professional, Energetic
   - Captions style: 4 presets
6. User clicks **Generate** (shows credit cost beforehand).
7. Progress screen shows stages with live status (SSE): Researching, Writing, Storyboarding, Creating visuals, Recording voice, Assembling, Rendering. It shows an ETA and a "you can leave, we'll email you" note.
8. Preview screen opens with the video player, the scene list, the sources panel and the script.
9. User edits (optional), then clicks **Export MP4**.
10. The video appears in the Library, where it can be re-downloaded, duplicated or deleted.

### 3.2 Secondary flows
- **Script approval mode (toggle):** pauses after the script, and the user edits or approves before assets are generated. This saves credits.
- **Edit a scene:** change text, swap the image, regenerate the image, change the visual type, change the duration.
- **Regenerate one scene:** costs fractional credits and re-renders only that scene.
- **Change voice or captions:** re-run TTS (voice) or re-render (captions).
- **Duplicate project / "make a variation":** same topic, new style or format.
- **Re-export in a different format:** 9:16 to 1:1 or 16:9 triggers a layout re-render. Re-rendering a different aspect ratio costs fewer credits than generation.
- **Buy credits or upgrade:** triggered from the paywall or the credits meter.

### 3.3 Screen inventory
Landing, Pricing, Login/Signup, Onboarding, Dashboard/Create, Progress, Editor/Preview, Library, Billing/Credits, Settings (profile, brand kit in P1), Admin panel (internal).

---

## 4. User Stories and Acceptance Criteria

| ID | Story | Acceptance criteria |
|---|---|---|
| US-1 | As a user, I enter a topic and get a complete video | Topic of 3–500 chars accepted; video produced with no other input required; defaults applied |
| US-2 | I choose format, length, level, voice, style | Selections persist per project and as defaults; changes before generation are reflected in the output |
| US-3 | I see progress | Stage-by-stage status updates within 2s of change; ETA shown; survives page refresh |
| US-4 | I preview the video | Plays in-browser at the correct aspect ratio; scrubbing works; captions overlay visible |
| US-5 | I edit script text | Edit updates narration; re-synthesizes audio only for changed scenes; the user sees the credit cost before confirming |
| US-6 | I regenerate a scene | Only that scene's visual or audio changes; previous version kept (undo) |
| US-7 | I change captions | Style, position and size change without regenerating audio |
| US-8 | I export MP4 | 720p with watermark (free) or 1080p (paid); file downloadable via signed URL; stays in Library for 30 days (free) or 12 months (paid) |
| US-9 | I see sources | List of URLs with titles; claims linked to source; flagged uncertain claims shown |
| US-10 | I buy credits | Stripe/Razorpay checkout; credits added within 30s of the webhook; receipt emailed |
| US-11 | I'm refunded on failure | A failed job auto-refunds credits; the ledger shows the entry |
| US-12 | I delete my data | Account deletion removes projects, assets and PII within 30 days |
| US-13 | I'm blocked from harmful topics | A clear message with no charge; the attempt is logged |

---

## 5. Functional Requirements

### 5.1 Authentication and accounts
- FR-A1: Email+password (verified), Google OAuth.
- FR-A2: Password reset, email verification, session management.
- FR-A3: Rate limit login attempts, with CAPTCHA after repeated failures.
- FR-A4: Profile: name, default settings, delete account.

### 5.2 Project creation
- FR-P1: Topic input (3–500 chars). Reject empty, gibberish or single-character input.
- FR-P2: Optional extra context (up to 2,000 chars) in the Customize drawer, with an optional list of "must cover" points.
- FR-P3: Credit cost estimate shown before Generate.
- FR-P4: Concurrency limit per plan (Free 1, Creator 2, Pro 4).
- FR-P5: Idempotency key to prevent double-submit.

### 5.3 AI pipeline (details in §8)
- FR-G1: Pipeline runs asynchronously as a persisted state machine.
- FR-G2: Each stage is idempotent, retryable and logged with cost and duration.
- FR-G3: Partial results are saved, so a failure resumes from the last good stage.
- FR-G4: Research produces 3–8 vetted sources. If none can be found, the system warns the user and generates from model knowledge, labeled "unverified".
- FR-G5: Script length matches duration (about 140–160 words per minute, ±10%).
- FR-G6: Scene count is 5–8 for 30s, 6–12 for 60s and 8–15 for 90s. Each scene is 3–10s.
- FR-G7: Each scene is typed as: `image`, `diagram`, `motion_template` or `text_card`.
- FR-G8: Style guide (palette, character descriptions, art style) is created once per project and injected into every image prompt.
- FR-G9: Voiceover is generated per scene with word-level timestamps, then concatenated.
- FR-G10: Timeline composer sets scene duration = audio duration + 0.3s padding.
- FR-G11: Output is a Remotion composition JSON, rendered to MP4 (H.264, AAC).

### 5.4 Motion graphics templates (V1 library, about 10)
Title card, bullet reveal, numbered steps, comparison (A vs B), definition callout, stat counter, simple bar chart, timeline, flow/process diagram (from Mermaid or SVG), quote/key takeaway, outro CTA. Each has: props schema, safe areas per aspect ratio, and animation presets.

### 5.5 Captions
- Word-level highlighting, 4 presets, font size and position controls.
- Safe zones are respected (avoid Instagram UI overlays in 9:16).
- Captions can be toggled off or burned in; an SRT download is available.
- Font fallback for unsupported glyphs.

### 5.6 Editor (basic)
- Scene list with thumbnails; drag to reorder; delete (minimum 2 scenes enforced).
- Edit narration and on-screen text inline.
- Replace image: upload (PNG/JPG up to 10MB), pick from the library, or regenerate with an edited prompt.
- Change visual type per scene.
- Change voice (all scenes) with credit cost warning.
- Background music: on/off, volume, 5 tracks (licensed).
- Caption style panel.
- Undo/redo for the last 20 actions. Autosave. Version history of the last 5 renders.
- "Re-render" is required after edits; the preview uses a lightweight in-browser Remotion Player, so full MP4 is rendered only on Export.

### 5.7 Preview and export
- Preview via Remotion Player (instant, no render needed).
- Export: 720p (free, watermark) or 1080p (paid) MP4; thumbnail PNG; SRT.
- Aspect ratio change at export triggers a re-layout.
- Signed download URL (expires in 15 min and is regenerated on demand).

### 5.8 Library
- Grid with thumbnail, title, date, status, format; search and filter by status.
- Actions: open, duplicate, rename, download, delete (soft delete with 7-day recovery).

### 5.9 Billing and credits
- FR-B1: Plans (§11). Credits reset monthly, and top-ups do not expire for 12 months.
- FR-B2: Credit ledger (append-only); balance is derived.
- FR-B3: Credits are reserved at the start of a job, committed on success and released on failure.
- FR-B4: Stripe (international) and Razorpay (India); webhooks verified and idempotent.
- FR-B5: Upgrade, downgrade, cancel; proration; invoices.
- FR-B6: Dunning for failed payments (3 retries, then downgrade to Free).

### 5.10 Notifications
Email: job complete, job failed (and refunded), low credits, payment failed. In-app toast and a notification bell.

### 5.11 Moderation and safety
- Prompt moderation before spending any credits. Output moderation on the script and images.
- Block categories: hate, sexual, violence, self-harm instructions, illegal activity, medical/legal advice presented as certain, impersonation of real persons, election misinformation.
- Sensitive topics (health, finance) add a disclaimer scene or caption.
- AI-generated content label in the video metadata and an optional on-screen tag.

### 5.12 Admin panel (internal, V1 minimal)
User lookup, job inspector (stage logs, costs, errors), manual credit adjustment, refund, ban user, feature flags, provider kill switches.

### 5.13 Multi-user isolation and per-user Instagram (NEW)

**Principle:** every logged-in person is an independent tenant. Nothing is shared between users unless a future Teams feature (V2) is explicitly enabled.

**Isolation requirements**
- FR-M1: Each user gets a private workspace created at signup. It holds their projects, ideas and drafts, assets, library, brand kit, credits, settings, notifications and connected accounts.
- FR-M2: Every user-owned row carries `user_id` (and `workspace_id`). All queries are scoped to the authenticated user. Postgres row-level security is enabled as a second layer, so a bug in application code can't leak data.
- FR-M3: Storage keys are namespaced `users/{user_id}/...`. Buckets are private, and access is only via short-lived signed URLs issued after an ownership check.
- FR-M4: IDs are non-guessable UUIDs. Accessing another user's resource returns 404 (not 403), so existence isn't revealed.
- FR-M5: Credits, plans, billing and invoices are per user. There is no shared pool in V1.
- FR-M6: Team members use the product like any other customer, with their own accounts. Internal staff get an `admin` role that is separate from the user role. Admin access to customer data requires a reason, and every access is written to `audit_logs`.
- FR-M7: Per-user rate limits and concurrency limits, so one user can't starve others (fair-share queue scheduling).
- FR-M8: Per-user data export and delete (GDPR/DPDP) removes projects, assets, tokens and connected accounts.
- FR-M9: Caches (assets, research) are keyed by content hash. Private user content is never served across users. Only public research data may be cached globally.

**Instagram connection (per user, one or more accounts owned by that user only)**
- FR-IG1: A "Connect Instagram" button in Settings starts Meta OAuth (Instagram Business or Creator accounts, via a linked Facebook Page, using the Instagram Graph API).
- FR-IG2: Tokens are stored encrypted (envelope encryption, KMS), tied to the connecting `user_id`, never logged and never shown in the UI. Long-lived tokens are refreshed before they expire (about 60 days).
- FR-IG3: A user sees and manages only their own connected accounts. Disconnect revokes the token and deletes it. Reconnect is guided when a token expires or permissions change.
- FR-IG4: Per-user accounts: the same Instagram account can't be connected to two different users (unique constraint on `ig_user_id`). A second attempt shows "already connected to another account".
- FR-IG5: Posting always uses the token of the video's owner. The system never falls back to another user's or a platform-owned account.
- FR-IG6 (V1.5): "Post to Instagram" and "Schedule" buttons on a finished video. Reels publishing uses the container, then publish flow, with status polling, retries and failure alerts. Caption and hashtags are AI-suggested and editable.
- FR-IG7: Requires Meta app review (`instagram_content_publish`, `instagram_basic`, `pages_show_list`). Start this early. Until approval, only app-roles/test users can connect.

**Instagram edge cases**
| Case | Behavior |
|---|---|
| User isn't on a Business/Creator account | Explain how to switch, with a link to instructions |
| No linked Facebook Page | Guided setup message |
| Token expired or revoked | Status "Reconnect needed", scheduled posts paused, email and in-app alert |
| User deletes their Instagram account or revokes access | Mark the connection invalid, cancel scheduled posts, notify |
| Publish fails (format, size, duration, rate limit) | Retry with backoff, then show the clear reason and a "retry" button. Credits aren't affected |
| Video violates Reels specs (length, aspect ratio, size) | Pre-validate and offer the 9:16 re-export |
| Daily publishing cap (Meta limit) | Queue and tell the user |
| User on the Free plan | Publishing may be gated to paid plans (decision in §16) |
| Disconnect while posts are scheduled | Warn, then cancel the schedule |

---

## 6. Edge Cases and Corner Cases

### 6.1 Input
| Case | Behavior |
|---|---|
| Topic too vague ("science") | Intake agent narrows it and shows the interpreted topic; the user may edit before generation if script approval is on, otherwise proceeds with a suggested angle |
| Topic too broad for the duration ("History of the world") | Auto-narrow to a focused angle and tell the user |
| Topic in another language | Detect it; if unsupported, show a message offering English |
| Mixed language | Use the selected output language |
| Very long input / pasted article | Truncate to the limit and offer a future URL/PDF-to-video |
| Prompt injection in topic or extra context ("ignore instructions…") | Treat as data, with system prompt isolation and output validation |
| Harmful or disallowed topic | Reject with a clear message; no charge |
| Medical, legal, financial topics | Generate with a disclaimer and conservative claims |
| Controversial or political topics | Neutral framing with multiple viewpoints, or decline |
| Real persons or brand names | Avoid defamatory claims; no likeness generation of real people |
| Duplicate submission or double-click | Idempotency key returns the existing job |
| Topic with no reliable sources (new event, niche) | "Unverified" label and the user is warned |
| Copyrighted text or lyrics requests | Decline reproduction, offer a summary |

### 6.2 Pipeline and AI
| Case | Behavior |
|---|---|
| LLM returns invalid JSON | Schema validation, then up to 2 repair retries, then fall back to a secondary model |
| Script is too long or short | Auto-trim or expand; re-check against the word budget |
| Hallucinated or unsupported claim | The fact-check agent flags or removes it; claims without a source are softened |
| Image provider refuses (safety filter) | Rewrite the prompt more neutrally; fall back to a template or text card |
| Image has garbled text or artifacts | The QA agent detects it where possible; prefer rendering text via Remotion, not in the image |
| Style inconsistency across scenes | Shared style guide and seed; a regenerate option |
| TTS fails, rate limits or times out | Backoff retry, then fall back to the Azure voice with notice |
| TTS mispronounces terms | Pronunciation dictionary/phoneme hints; the user can edit the spelling of a word in narration |
| Audio timestamps missing | Fall back to Whisper alignment |
| Total audio longer than the target | Tighten the script, or accept up to +15% and tell the user |
| Provider outage | Circuit breaker, secondary provider, queue and notify; never charge |
| Render crash or out-of-memory | Retry on a larger worker; reduce resolution as a last resort |
| Blank frames or missing assets at render | The QA agent blocks delivery and re-runs the affected stage |
| Job stuck for over 15 min | The watchdog marks it failed, refunds, and alerts |
| Server restarts mid-job | Resume from the last persisted stage |
| Cost per job exceeds the cap | Abort with fallback to cheaper models; alert ops |

### 6.3 Editing
| Case | Behavior |
|---|---|
| Edit during generation | Editing disabled until the preview-ready state |
| Delete all but one scene | Minimum 2 scenes enforced |
| Narration edit makes a scene much longer | Duration auto-adjusts, with a total-length warning above 90s plus tolerance |
| Concurrent edits in two tabs | Last write wins with a version check and a "changed elsewhere" prompt |
| Uploaded image is invalid, too large or NSFW | Validate type and size, scan, reject with a message |
| Undo after regeneration | Previous asset version restored without credit refund |
| User navigates away mid-regeneration | The job continues; the result appears on return |
| Voice change after manual narration edits | Edits preserved; all audio re-synthesized |

### 6.4 Billing and credits
| Case | Behavior |
|---|---|
| Insufficient credits | Block with an upgrade and top-up CTA; the estimate is shown in advance |
| Credits consumed in parallel jobs | Reserve atomically (row lock or transaction) |
| Payment succeeds but the webhook is delayed | Poll checkout status, and credit idempotently when the webhook arrives |
| Duplicate webhook | Idempotent by event ID |
| Refund or chargeback | Deduct credits (may go negative, which blocks generation) |
| Downgrade with a pending balance | Plan takes effect next cycle; credits kept until the reset |
| Free-tier abuse (many accounts) | Email verification, device and IP heuristics, disposable-email block |
| Failed job after partial asset use | Full refund in V1 (simplicity), tracked in ledger as `refund` |
| Currency and tax | Localized pricing; GST for India; VAT via Stripe Tax |

### 6.5 Export and storage
| Case | Behavior |
|---|---|
| Download link expired | Regenerate a signed URL on click |
| Large file download on a slow network | Resumable (HTTP range) downloads |
| Expired free-tier assets (after 30 days) | Warn 7 days before; email; deletion after expiry |
| Watermark removal after upgrade | Re-render available without a watermark (a small credit cost or free for the last 7 days) |
| User deletes a project during render | Cancel the job, refund unused reservations |
| Browser can't play H.264 | Fallback with a download-only prompt |

### 6.6 Accessibility and localization
Right-to-left scripts (Arabic, Urdu) are not in V1. Fonts need glyph fallback. Captions are high-contrast. Keyboard navigation and screen-reader labels apply across the UI.

---

## 7. System Architecture

```
[Next.js Web App] --REST/SSE--> [API Service (NestJS or FastAPI)]
                                     |        |
                              [Postgres]  [Redis]
                                     |        |
                              [Object Storage S3/R2]
                                     |
                           [Orchestrator / Workflow Engine]
                      (Inngest / Trigger.dev / BullMQ state machine)
            +--------------+---------------+------------------+
        [Research]     [LLM Workers]   [Asset Workers]    [Render Workers]
        Tavily/Gemini   Gemini        Gemini image/       Remotion
        grounding                     ElevenLabs/Azure    (Lambda or containers)
                                           |                   |
                              [Moderation APIs]        [Thumbnails, SRT]
```

**Components**
- **Frontend:** Next.js, Tailwind, Remotion Player for preview, SSE client for progress.
- **API:** auth, projects, billing, signed URLs. Stateless and horizontally scalable.
- **Orchestrator:** durable workflow with steps, retries, timeouts and parallel fan-out for assets.
- **Providers (behind interfaces):** `LLMProvider`, `ImageProvider`, `TTSProvider`, `SearchProvider`, `ModerationProvider`. Each has a primary and a fallback.
- **Render:** Remotion on AWS Lambda or autoscaled containers, using FFmpeg for muxing audio and music.
- **Storage:** R2/S3 (images, audio, MP4); lifecycle rules per plan; CDN for previews.
- **Observability:** structured logs with `job_id`, Sentry for errors, metrics (stage latency, cost, success), cost dashboard, alerts.
- **Security:** private buckets with signed URLs, secrets in a secret manager, per-user row-level access, webhook signature checks, rate limiting at the edge, CSP and dependency scanning.

**Key design decisions**
1. The timeline is **data** (JSON). Edits mutate JSON, and the preview and render both consume it. This makes edits cheap.
2. Text is rendered by Remotion, not baked into images, so captions and labels are always crisp.
3. Assets are cached and versioned by content hash, so unchanged scenes are never regenerated.
4. Every provider call logs its cost, which allows per-user and per-plan margin analysis.

---

## 8. AI Agent Workflow

| # | Agent | Input | Output | Validation and fallback |
|---|---|---|---|---|
| 0 | **Moderation gate** | Topic and context | Allow or reject | Reject means no charge |
| 1 | **Intake** | Topic, level, duration, language | Normalized brief (angle, learning objectives, key terms) | Narrows vague topics |
| 2 | **Research** | Brief | 3–8 sources with extracted facts | If fewer than 2 sources, mark "unverified" |
| 3 | **Script** | Brief and facts | Script: hook, 2–4 key points, example, recap, CTA; word-budgeted | Length check, reading level check |
| 4 | **Fact-check** | Script and sources | Claims tagged supported, uncertain or removed | Revises the script on flags |
| 5 | **Storyboard** | Final script | 6–15 scenes: narration, on-screen text, visual type, prompt, template props | JSON schema validation |
| 6 | **Style guide** | Brief and style preset | Palette, art style, consistent descriptors, seed | One per project |
| 7a | **Image agent** (parallel) | Scene prompts and style guide | Images | Safety rewrite, then template fallback |
| 7b | **Diagram/motion agent** (parallel) | Scene data | Template props or SVG/Mermaid | Render check |
| 7c | **Voice agent** (parallel) | Narration | Audio and word timestamps | Fallback voice, Whisper alignment |
| 8 | **Timeline composer** | All assets | Composition JSON (durations, transitions, captions, music) | Duration math check |
| 9 | **Renderer** | Composition | MP4, thumbnail, SRT | Retry on a bigger worker |
| 10 | **QA agent** | MP4 and metadata | Pass or fail report | Re-runs the failing stage once, then escalates |

**Orchestration rules**
- Steps 7a to 7c run in parallel, per scene.
- Each step writes its output to the DB before the next begins.
- Retries: 3 attempts with exponential backoff, and a distinct error taxonomy (retryable, fixable by prompt, fatal).
- Per-stage timeout and a global job timeout (15 min).
- Cost guard: each stage reports cost, and the job aborts above the plan cap.
- Prompts are versioned and stored; each job records the prompt version for reproducibility.

**Latency budget (60s video, target of 5 min at p90):** intake and research about 30s, script and fact-check about 40s, storyboard about 15s, assets in parallel about 60s, composing about 5s, render about 90s, QA about 10s.

---

## 9. Database Design (PostgreSQL)

```
users(id, email, name, auth_provider, plan_id, locale, country, created_at, deleted_at)
plans(id, name, monthly_credits, max_resolution, watermark, concurrency, price_usd, price_inr)
subscriptions(id, user_id, provider, provider_sub_id, plan_id, status, current_period_end)
payments(id, user_id, provider, provider_payment_id, amount, currency, status, created_at)
credit_ledger(id, user_id, delta, reason[grant|purchase|reserve|commit|release|refund|adjust], ref_type, ref_id, created_at)
projects(id, user_id, title, topic, extra_context, format, duration_s, language, level, tone, style_preset, voice_id,
         approval_mode, status, current_stage, error_code, cost_usd, created_at, updated_at, deleted_at)
research_sources(id, project_id, url, title, snippet, reliability_score, fetched_at)
scripts(id, project_id, version, content, word_count, unverified, approved_at)
claims(id, script_id, text, status[supported|uncertain|removed], source_id)
style_guides(id, project_id, palette_json, art_style, descriptors, seed)
scenes(id, project_id, idx, narration, on_screen_text, visual_type, prompt, template_id, template_props_json,
       duration_ms, transition, version)
assets(id, scene_id, project_id, type[image|svg|audio|music|thumbnail], storage_key, content_hash, provider, model,
       cost_usd, version, is_active, created_at)
voiceovers(id, project_id, voice_id, provider, storage_key, timestamps_json, duration_ms)
timelines(id, project_id, version, composition_json, created_at)
renders(id, project_id, timeline_version, resolution, format, status, storage_key, size_bytes, duration_ms, error, cost_usd, created_at)
jobs(id, project_id, type[generate|regenerate_scene|render], stage, status, attempts, cost_usd, error_code,
     idempotency_key, started_at, finished_at)
job_events(id, job_id, stage, status, message, cost_usd, created_at)
workspaces(id, owner_user_id UNIQUE, name, created_at)        -- one private workspace per user in V1; all user data also has user_id
connected_accounts(id, user_id, provider[instagram], provider_account_id UNIQUE, username, page_id,
                   token_encrypted, token_expires_at, scopes, status[active|expired|revoked], connected_at)
scheduled_posts(id, user_id, project_id, render_id, connected_account_id, caption, hashtags, scheduled_at,
                status[scheduled|publishing|published|failed|cancelled], provider_post_id, error, attempts)  -- V1.5
brand_kits(id, user_id, logo_key, colors_json, font)            -- P1
music_tracks(id, name, license, storage_key, duration_s)
voices(id, provider, provider_voice_id, name, language, gender, preview_url, tier)
moderation_logs(id, user_id, project_id, input_hash, category, action, created_at)
notifications(id, user_id, type, payload_json, read_at, created_at)
audit_logs(id, actor_id, action, target, metadata_json, created_at)
```
**Indexes:** `projects(user_id, created_at)`, `jobs(project_id, status)`, `credit_ledger(user_id, created_at)`, unique `jobs(idempotency_key)`, unique `payments(provider, provider_payment_id)`, and `assets(content_hash)`.
**Rules:** row-level security policies of the form `user_id = current_user_id` on every user-owned table (projects, scenes, assets, renders, credit_ledger, connected_accounts, scheduled_posts, and so on). The ledger is append-only. Credits balance = sum of the ledger, cached in `users` with reconciliation. Soft-delete projects. Row-level security on user-owned tables. Retention jobs purge expired assets.

---

## 10. API Design (REST, JSON, `/v1`)

**Auth:** `POST /auth/signup`, `/auth/login`, `/auth/google`, `/auth/logout`, `/auth/reset-password`

**Projects**
```
POST   /projects                      {topic, context?, format, duration, language, level, tone, style, voice, approval_mode}
                                      -> 202 {project_id, job_id, credit_estimate}; header Idempotency-Key
GET    /projects?status=&q=&cursor=   list
GET    /projects/:id                  full project (script, scenes, assets, sources, timeline)
PATCH  /projects/:id                  rename, settings
DELETE /projects/:id                  soft delete
POST   /projects/:id/duplicate
GET    /projects/:id/events           SSE: {stage, status, progress, eta}
POST   /projects/:id/approve-script   (approval mode)
```

**Editing**
```
PATCH  /projects/:id/script
PATCH  /projects/:id/scenes/:sid      {narration?, on_screen_text?, visual_type?, duration_ms?}
POST   /projects/:id/scenes/reorder   {order: [ids]}
DELETE /projects/:id/scenes/:sid
POST   /projects/:id/scenes/:sid/regenerate   {target: image|voice|both, prompt?}
POST   /projects/:id/scenes/:sid/upload       (multipart image)
PATCH  /projects/:id/captions         {style, position, size, enabled}
PATCH  /projects/:id/audio            {voice_id?, music_id?, music_volume?}
POST   /projects/:id/undo | /redo
```

**Render and export**
```
POST   /projects/:id/renders          {resolution, format} -> 202 {render_id}
GET    /renders/:id                   status
GET    /renders/:id/download          -> signed URL
GET    /projects/:id/export/srt
```

**Instagram (per user; every call is scoped to the caller)**
```
GET    /integrations/instagram/connect      -> redirect URL to Meta OAuth (state bound to the user session)
GET    /integrations/instagram/callback     (OAuth callback, verifies state, stores the encrypted token)
GET    /integrations/instagram              the caller's connected accounts and status
DELETE /integrations/instagram/:id          disconnect and revoke
POST   /projects/:id/publish/instagram      {account_id, caption, hashtags, when?}   (V1.5)
GET    /posts, DELETE /posts/:id            scheduled and past posts (caller's only)
```

**Catalog and account**
```
GET /voices?language=      GET /styles      GET /templates      GET /music
GET /me                    PATCH /me        DELETE /me
GET /credits               GET /credits/ledger
POST /billing/checkout     POST /billing/portal      GET /billing/invoices
POST /webhooks/stripe      POST /webhooks/razorpay
```

**Conventions:** consistent error format `{error:{code,message,details}}`; codes such as `INSUFFICIENT_CREDITS`, `MODERATION_BLOCKED`, `CONCURRENCY_LIMIT`, `PROVIDER_UNAVAILABLE`; rate limits per user and IP; cursor pagination; OpenAPI spec auto-generated; webhook signature validation.

---

## 11. Pricing Model

**Credit unit:** 1 credit is about 10 seconds of finished video, so a 60s video is 6 credits.

| Plan | Price | Credits/mo | Resolution | Extras |
|---|---|---|---|---|
| Free | $0 | 12 (about 2 minutes) | 720p, watermark | 1 concurrent job, 30-day storage |
| Creator | $19/mo | 90 (about 15 minutes) | 1080p, no watermark | 2 concurrent jobs, all voices |
| Pro | $49/mo | 300 (about 50 minutes) | 1080p | 4 concurrent jobs, priority queue, brand kit (P1) |
| Team (P2) | $129/mo | 900 | 1080p | Seats and roles |
| Top-up | $10 / 50 credits | Does not expire for 12 months | | |

**India pricing:** about ₹499 (Creator) and ₹1,299 (Pro).
**Action costs:** full generation is 1 credit per 10s; scene regeneration is 0.5 to 1 credit; re-render in another format is 1 credit; premium voices carry a +30% multiplier.
**Unit economics target:** COGS at or below $0.50 per 60s video (Gemini calls, ElevenLabs about 900 characters, rendering). The Creator plan at 15 videos costs about $7.50, a gross margin above 60%. Validate in the prototype before locking prices.

---

## 12. MVP Scope

**In (P0):** auth; the create form with defaults; the full 10-agent pipeline; ElevenLabs voice (3 curated voices) plus a fallback; 4 style presets; about 10 motion templates; captions (4 presets); the Remotion preview; the basic editor (scene text, regenerate, replace image, reorder, delete, voice, captions, music toggle); MP4 export (720p watermark / 1080p); Library; credits and ledger; Stripe and Razorpay; moderation; email notifications; minimal admin; analytics and cost tracking.

**Also in (multi-user):** private workspace per user, row-level security, namespaced storage, per-user credits, and the per-user "Connect Instagram" OAuth flow with token storage (posting itself ships in V1.5; submit the Meta app review during V1 so it's ready).

**Out:** automated Instagram posting/scheduling and YouTube publishing, shared accounts and teams, avatars, voice cloning, teams, analytics for published content, a full timeline editor, URL/PDF input, additional languages, API access.

**Milestones (8–10 weeks, 3–4 engineers)**
| Weeks | Deliverable |
|---|---|
| 0–1 | CLI prototype for 3 topics; measure quality, cost and latency; go or no-go |
| 2–3 | Auth, DB, project API, orchestrator skeleton, provider interfaces |
| 4–5 | Full pipeline, templates, Remotion composition, render workers |
| 6–7 | UI: create, progress, preview, editor, library |
| 8 | Billing, credits, moderation, email, admin |
| 9–10 | Beta with 10–20 educators, hardening, launch |

**Launch criteria:** job success at or above 95%; p90 latency at or below 5 min; fact-error rate under 5% on a 50-video audit; blind rating at or above 4/5; COGS under target.

---

## 13. Roadmap
- **V1.1:** Hindi (and other languages), brand kit, script approval improvements, more templates, translations.
- **V1.5:** Instagram, YouTube Shorts and LinkedIn publishing and scheduling; bulk generation from a topic list; content calendar.
- **V2:** URL/PDF/blog-to-video, voice cloning, quizzes and end-cards, teams and approval workflows, analytics, thumbnails, AI video clips (premium).
- **V3:** public API and webhooks, LMS integrations (Google Classroom, Moodle), interactive videos, template marketplace, white-label.

---

## 14. Success Metrics
| Area | Metric | Target |
|---|---|---|
| Activation | Signup to first completed video | above 60% |
| Speed | Time to first video | under 10 min |
| Engagement | Exports per generated video | above 50% |
| Quality | Average rating | at least 4/5 |
| Quality | Scene regeneration rate | under 30% |
| Accuracy | Fact-error rate (audit) | under 5% |
| Retention | Week-4 retention | above 30% |
| Revenue | Free to paid conversion | above 5% |
| Revenue | Gross margin | above 60% |
| Reliability | Job success | above 95% |
| Reliability | p90 generation time (60s video) | at most 5 min |
| Cost | COGS per 60s video | at most $0.50 |
| Support | Refund and failure tickets | under 3% of jobs |

Instrument events: signup, topic_submitted, stage_completed, preview_viewed, edit_made, export_clicked, upgrade_viewed, payment_completed, with per-job cost.

---

## 15. Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Factual errors | Loss of trust, the core promise broken | Source-grounded research, fact-check agent, citations, "unverified" labels, audits |
| High AI cost | Negative margins | Credits, caching, cheaper models for drafts, per-job caps, cost dashboards, fallback to Azure for TTS |
| Visual inconsistency or bad AI images | Poor quality | Style guide and seed, diagrams and templates over free-form images, text rendered by Remotion |
| Voice cost (ElevenLabs) | Margin erosion | Tiered voices, character caps, fallback provider |
| Slow or failing renders | Churn | Parallel assets, autoscaled workers, retries, watchdog and refunds |
| Sync drift | Unprofessional output | Word-level timestamps drive scene timing; QA checks |
| Provider outage or API changes | Downtime | Provider interfaces, secondary providers, circuit breakers |
| Remotion licensing | Legal and cost surprise | Confirm the license before launch; budget for the company license |
| Copyright and harmful content | Legal exposure | Moderation, licensed music and fonts only, no real-person likenesses, AI labels |
| Abuse of the free tier | Cost leakage | Email verification, rate limits, device and IP checks, a watermark |
| Prompt injection | Unsafe output | Isolated prompts, schema validation, output moderation |
| Competitors | Share loss | Niche on educator accuracy and visual explainers, fast iteration |
| Privacy (GDPR/DPDP) | Fines | Data deletion flow, minimal data, DPA with providers |
| Scope creep | Delayed MVP | Strict P0 list, prototype gate at week 1 |

---

## 16. Open Questions
1. Final language scope for V1 (English only, or English and Hindi)?
2. ~~Product name and domain~~ Decided: VideoReel (videoreel.ai), see §17.
2a. Should Instagram posting be limited to paid plans?
2b. Can one user connect more than one Instagram account (current design: yes, each owned only by them)?
3. Self-hosted rendering or Remotion Lambda?
4. Free tier limits (credits, watermark style)?
5. Will you offer a "kids" level, and does it need extra compliance review (children's content rules)?
6. Target launch date and budget?

---

## 17. Naming
**Final name: VideoReel (videoreel.ai).** Chosen because it contains the word "video" and doesn't limit the platform to education or any one type of creator.

**Domain status (RDAP check, 2026-11-10; "likely available" is not a guarantee):** `videoreel.ai` likely available, `videoreel.io` likely available, `videoreel.com` taken. `storyreel.ai` and `listenreel`-style names were rejected (storyreel.ai taken; ListenReel is an existing audiobook site).

**Before launch (actions):**
1. Register videoreel.ai now (and videoreel.io as a defensive domain).
2. Run trademark searches (India and USPTO). "VideoReel" is a generic-sounding name, so a logo/wordmark and a distinctive brand identity matter.
3. Claim Instagram, YouTube, X and LinkedIn handles; check app-store names.
4. Consider approaching the `.com` owner later.

**Known trade-off:** the name is descriptive, so it may be harder to trademark and to rank in search. Mitigate with a strong visual identity and distinctive tagline.

Other candidates considered (all `.com` taken, `.ai` likely available unless noted):

| Name | .com | .ai |
|---|---|---|
| VideoReel (**selected**) | taken | likely available |
| StoryReel | taken | taken |
| LessonReel | taken | likely available |
| VidLearn | taken | likely available |
| TeachReel | taken | likely available |
| ExplainVid | taken | likely available |
| VidExplain | taken | likely available |
| LearnReel | taken | likely available |
| ClipTeach | taken | likely available |
| ReelEdu | taken | likely available |
| Explainly, Explainr, Explaino, Lumivid | taken | taken |

---

## 18. AI Tools, APIs and Free-Tier Plan
Prices and free tiers change often. Re-verify each on its pricing page before committing. All providers sit behind interfaces so they can be swapped.

| Function | Chosen (primary) | Alternatives / fallback | Free or trial option for prototyping |
|---|---|---|---|
| LLM (intake, script, storyboard, fact-check) | **Google Gemini** (Flash) | OpenAI GPT-4o-mini, Anthropic Claude, Groq/OpenRouter | Gemini free tier via AI Studio |
| Research and web search | **Gemini with Google Search grounding**, plus **Tavily** | Brave Search, Serper, Exa, Wikipedia/Wikidata | Tavily about 1,000 searches/mo; Wikipedia free |
| Image and illustration | **Gemini/Imagen image generation** | Flux (Replicate, fal.ai, Together), Ideogram, Stable Diffusion (self-hosted) | Gemini/AI Studio free tier; small credits on Replicate/fal |
| Diagrams | **LLM-generated SVG/Mermaid**, rendered in Remotion | Manim, Motion Canvas | Free (open source) |
| Voice-over (TTS) | **ElevenLabs** (premium; word timestamps) | Azure Neural TTS (standard tier), Google Cloud TTS, OpenAI TTS, Edge-TTS (prototype only), Kokoro/Piper (self-hosted) | ElevenLabs about 10k chars/mo (non-commercial); Azure 500k chars/mo free |
| Word timing and alignment | **ElevenLabs timestamps** | Azure word boundaries, faster-whisper/Whisper | Whisper is free locally |
| Video assembly and motion graphics | **Remotion** (React) and **FFmpeg** | Motion Canvas, Manim, Lottie | Free for individuals and small teams; check the company license threshold |
| Stock and music (licensed) | Pexels, Pixabay, Unsplash APIs | YouTube Audio Library (check the license) | Free |
| Moderation | OpenAI Moderation API | Gemini safety settings | Free |
| Database, auth | **Supabase** (Postgres, row-level security) | Neon, self-hosted | Free tier |
| Storage and CDN | **Cloudflare R2** | S3 | 10GB free, no egress fees |
| Queue and workflows | **Inngest** or **Trigger.dev** (or Redis with BullMQ) | Celery | Free tiers; Upstash Redis free tier |
| Hosting | Vercel (web), Railway/Render/Fly.io (workers), Remotion Lambda or containers (render) | AWS | Free/hobby tiers |
| Payments | **Stripe** (global), **Razorpay** (India) | | No upfront cost |
| Email | Resend / Postmark | | Free tier |
| Observability | Sentry, Logtail/Axiom | | Free tiers |
| Instagram | Meta Instagram Graph API | | Free, but requires Meta app review |

**$0 prototype stack (week 1):** Tavily plus Wikipedia, Gemini Flash (script, storyboard, images), ElevenLabs free tier or Azure/Edge-TTS for voice, Remotion plus FFmpeg locally, Supabase plus R2.

**Cost and quality notes**
- ElevenLabs is the most natural voice but the most expensive. Budget about 900 characters per 60s video. Offer "Standard" (Azure) and "Premium" (ElevenLabs) voices, and charge a credit multiplier for Premium.
- AI video-clip models (Runway, Luma, Kling, Veo, Pika) are expensive per second, so they're out of V1.
- Prefer diagrams, templates and Remotion-rendered text over free-form AI images for accuracy and consistency.
- The ElevenLabs free tier does not allow commercial use. A paid plan is needed before launch.

---

## 19. Competitive Positioning
Competitors fall into five groups: avatar presenters (Synthesia, HeyGen, JoggAI), slide/lecture converters (Leadde), template and animation builders (InVideo, Canva, Steve AI, Vyond, Pictory, Fliki), generative clip models (Runway, Luma, Kling, Veo, Pika) and clip repurposers (Opus Clip).

**VideoReel's differentiators:** (1) one-topic input with no editing skills needed; (2) researched, source-cited, fact-checked scripts; (3) real explanatory visuals (diagrams, motion graphics) instead of stock footage or talking heads; (4) per-scene regeneration and light editing; (5) vertical-first output with captions, aimed at Instagram educators and creators, with direct posting per user in V1.5.

---

## 20. Key Decisions Log
| # | Decision | Notes |
|---|---|---|
| 1 | Product name: **VideoReel (videoreel.ai)** | Broad "video" brand, not limited to education |
| 2 | V1 focus: educational explainer videos | Wedge market; platform expands later |
| 3 | Stack: Gemini + ElevenLabs + Remotion (core) | Provider interfaces and fallbacks (Azure TTS, other LLMs) |
| 4 | Per-user private workspaces | Every user (including your team) has an isolated dashboard, projects, credits and Instagram connection |
| 5 | Instagram: per-user OAuth, no shared accounts | Connect in V1; posting and scheduling in V1.5; start Meta app review early |
| 6 | Language: English in V1, Hindi in V1.1 | Open question #1 |
| 7 | Credit-based pricing | 1 credit is about 10 seconds of video |
| 8 | Validate before building the UI | Week-1 CLI prototype on 3 topics to measure quality, cost and latency |

## 21. Immediate Next Steps
1. Register videoreel.ai and claim social handles; start the trademark search.
2. Apply for the Meta developer app and Instagram Graph API review.
3. Build the CLI prototype and measure quality, cost per video and render time.
4. Recruit 5–10 educators for blind voice and quality testing.
5. Resolve the open questions in §16, then start the engineering breakdown.
