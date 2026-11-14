# VideoReel: Architecture Diagrams

Mermaid diagrams. They render in GitHub, VS Code (Markdown preview) and the Copilot app editor canvas.

## 1. High-level system architecture
```mermaid
flowchart TB
  U[User browser<br/>Next.js app + Remotion Player] -->|REST / SSE| API[API service<br/>auth, projects, billing, signed URLs]
  API --> DB[(Postgres / Supabase<br/>RLS per user)]
  API --> R[(Redis / queue)]
  API --> S3[(R2 / S3 storage<br/>users/user_id/...)]
  API -->|start job| ORCH[Orchestrator<br/>Inngest / Trigger.dev<br/>durable state machine]

  ORCH --> MOD[Moderation]
  ORCH --> LLMW[LLM workers<br/>Gemini: intake, script,<br/>fact-check, storyboard]
  ORCH --> RES[Research<br/>Gemini grounding, Tavily, Wikipedia]
  ORCH --> ASSET[Asset workers<br/>parallel per scene]
  ORCH --> RND[Render workers<br/>Remotion + FFmpeg<br/>Lambda or containers]

  ASSET --> IMG[Image: Gemini / Imagen]
  ASSET --> TTS[Voice: ElevenLabs<br/>fallback Azure TTS]
  ASSET --> TPL[Templates / SVG diagrams]

  LLMW --> DB
  ASSET --> S3
  RND --> S3
  ORCH -->|progress events| API
  API -->|SSE| U

  API --> PAY[Stripe / Razorpay]
  API --> IG[Instagram Graph API<br/>per-user OAuth, V1.5]
  API --> MAIL[Email: Resend]
  ORCH -.-> OBS[Sentry, logs, cost dashboard]
```

## 2. Generation pipeline (how a video is made)
```mermaid
flowchart LR
  A[Topic + options] --> B[0 Moderation]
  B -->|blocked| X[Reject, no charge]
  B --> C[1 Intake<br/>brief, word budget]
  C --> D[2 Research<br/>facts + sources]
  D --> E[3 Script]
  E --> F[4 Fact-check]
  F --> G[5 Storyboard<br/>scenes]
  G --> H[6 Style guide]
  H --> I1[7a Images]
  H --> I2[7b Diagrams / templates]
  H --> I3[7c Voice + word timestamps]
  I1 --> J[8 Timeline composer<br/>composition.json]
  I2 --> J
  I3 --> J
  J --> K[9 Remotion render<br/>MP4, SRT, thumbnail]
  K --> L[10 QA checks]
  L -->|pass| M[Preview + export]
  L -->|fail| N[Retry stage once, then refund + alert]
```

## 3. Request sequence (what happens when the user clicks Generate)
```mermaid
sequenceDiagram
  actor User
  participant Web as Next.js app
  participant API
  participant DB as Postgres
  participant Orch as Orchestrator
  participant AI as Gemini / ElevenLabs
  participant R as Render worker
  participant S3 as R2 storage

  User->>Web: Enter topic, click Generate
  Web->>API: POST /projects (Idempotency-Key)
  API->>DB: Check credits, reserve credits, create project + job
  API->>Orch: Start workflow(job_id)
  API-->>Web: 202 {project_id}
  Web->>API: GET /projects/:id/events (SSE)
  loop each stage
    Orch->>AI: Call provider (retry, fallback)
    AI-->>Orch: Result
    Orch->>DB: Save stage output + cost
    Orch-->>API: Stage event
    API-->>Web: Progress update
  end
  Orch->>S3: Store images, audio
  Orch->>R: Render composition.json
  R->>S3: Upload MP4, SRT, thumbnail
  Orch->>DB: Mark ready, commit credits
  API-->>Web: Done event (and email)
  User->>Web: Preview in Remotion Player, edit, Export
  Web->>API: GET /renders/:id/download
  API-->>Web: Signed URL
```

## 4. Edit and regenerate one scene
```mermaid
flowchart LR
  E[User edits text or clicks Regenerate scene] --> P[PATCH / POST scene]
  P --> H{Content hash changed?}
  H -->|no| Z[Reuse cached asset]
  H -->|yes| R[Re-run 7a/7b/7c for that scene only]
  R --> C[Recompute timeline JSON]
  Z --> C
  C --> V[Instant preview in Remotion Player]
  V --> X[Export: full MP4 render]
```

## 5. Multi-user isolation and per-user Instagram
```mermaid
flowchart TB
  subgraph UserA[User A workspace]
    A1[Projects, assets, credits]
    A2[Instagram token A, encrypted]
  end
  subgraph UserB[User B workspace]
    B1[Projects, assets, credits]
    B2[Instagram token B, encrypted]
  end
  API[API: every query scoped to user_id] --> RLS[(Postgres RLS: user_id = current user)]
  API --> ST[(Storage: users/A/..., users/B/...<br/>signed URLs after ownership check)]
  RLS --- UserA
  RLS --- UserB
  A2 -->|only A's videos| IGA[A's Instagram account]
  B2 -->|only B's videos| IGB[B's Instagram account]
```

## 6. Instagram connect and post (V1.5)
```mermaid
sequenceDiagram
  actor User
  participant App
  participant API
  participant Meta as Meta OAuth / Graph API
  participant Q as Scheduler
  User->>App: Click Connect Instagram
  App->>API: GET /integrations/instagram/connect
  API-->>User: Redirect to Meta (state bound to session)
  User->>Meta: Log in, grant permissions
  Meta-->>API: Callback with code
  API->>Meta: Exchange for long-lived token
  API->>API: Encrypt and store token for this user only
  User->>App: Post or Schedule a video
  App->>API: POST /projects/:id/publish/instagram
  API->>Q: Queue post at scheduled time
  Q->>Meta: Create Reel container, poll status, publish
  Meta-->>Q: Post ID or error
  Q-->>User: Notification (success or failure and retry)
```

## 7. Job state machine and failure handling
```mermaid
stateDiagram-v2
  [*] --> Queued
  Queued --> Running: credits reserved
  Running --> Running: next stage OK
  Running --> Retrying: retryable error
  Retrying --> Running: backoff, fallback provider
  Retrying --> Failed: attempts exhausted
  Running --> Failed: fatal error or timeout (15 min)
  Running --> Succeeded: QA pass
  Failed --> Refunded: credits released
  Succeeded --> [*]: credits committed
  Refunded --> [*]
```

## 8. How it works (plain-language walkthrough)
1. **Input:** the user types a topic and clicks Generate. The API checks credits, reserves them and starts a job.
2. **Brain:** the orchestrator runs the stages in order. Gemini researches, writes and fact-checks the script, then splits it into scenes.
3. **Hands:** for each scene, images, diagrams and the ElevenLabs voice are created in parallel. ElevenLabs returns word timestamps.
4. **Glue:** the timeline composer uses the audio timing to set each scene's length and the caption timing, and writes one `composition.json`.
5. **Render:** Remotion turns `composition.json` into an MP4, with FFmpeg handling audio. A QA step checks the result.
6. **Delivery:** the browser shows live progress, then a preview. The user edits (cheap, JSON-based) and exports. Credits are committed on success and refunded on failure.
7. **Privacy:** every step is scoped to the user, so nobody sees anyone else's data or Instagram account.
