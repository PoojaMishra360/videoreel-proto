# VideoReel.ai — Database Design (v1.0, MongoDB)

MongoDB Atlas. The PRD's relational schema becomes collections. **Isolation rule:** every document has `userId`; the data-access layer takes `userId` for every query (no row-level security in Mongo). Use Mongoose or the official driver + zod.

## 1. Collections overview
| Collection | Purpose |
|---|---|
| `users` | Accounts, plan, preferences |
| `workspaces` | Optional (Team plan, V2); one personal workspace per user in V1 |
| `projects` | A video idea and its settings |
| `project_versions` | Snapshots of script/storyboard/composition for edit history |
| `scenes` | Scene-level content and assets |
| `assets` | Files in object storage (images, audio, renders) |
| `generation_jobs` | Pipeline runs, stage status, cost |
| `renders` | Render outputs per format |
| `connected_accounts` | Instagram OAuth (encrypted tokens) |
| `scheduled_posts` | Instagram scheduling |
| `credit_ledger` | Append-only credit transactions |
| `subscriptions` | Plan/payment state |
| `brand_kits` | Logo, colors, fonts (V1.1) |
| `audit_logs` | Security-relevant events |

## 2. Schemas
### users
```js
{ _id, email (unique), name, avatarUrl, authProvider: "google"|"email", passwordHash?,
  plan: "free"|"creator"|"pro"|"team", creditsBalance: Number,
  defaultLanguage: "en", locale, timezone, status: "active"|"suspended"|"deleted",
  createdAt, updatedAt, lastLoginAt }
```
Indexes: `{email:1}` unique.

### sessions
```js
{ _id: sha256(sessionToken), userId, createdAt, expiresAt }
```
The raw random session token is held only in an `HttpOnly`, `SameSite=Lax` cookie. Sessions expire after 7 days; MongoDB removes expired records using a TTL index on `expiresAt`.
Indexes: `{expiresAt:1}` with `expireAfterSeconds: 0`.

### projects
```js
{ _id, userId, title, topic, language: "en"|"hi"|"ta"|..., level, durationTarget,
  formats: ["9:16","1:1","16:9"], voiceId, styleGuide: {palette, fonts, illustrationStyle},
  status: "draft"|"generating"|"ready"|"failed",
  currentVersionId, script: {...}, brief: {...}, research: {sources:[{title,url}]},
  thumbnailAssetId, createdAt, updatedAt, deletedAt? }
```
Indexes: `{userId:1, updatedAt:-1}`, `{userId:1, status:1}`.

### scenes
```js
{ _id, userId, projectId, order, narration, visualType, template, onScreenText,
  imagePrompt, props: {}, imageAssetId?, audioAssetId?,
  wordTimestamps: [{word, start, end}], durationMs, status }
```
Indexes: `{projectId:1, order:1}`, `{userId:1, projectId:1}`.

### assets
```js
{ _id, userId, projectId, type: "image"|"audio"|"music"|"render"|"thumbnail",
  storageKey: "users/{userId}/projects/{projectId}/...", mime, sizeBytes,
  meta: {width,height,durationMs,provider,model}, createdAt }
```
Indexes: `{userId:1, projectId:1, type:1}`.

### generation_jobs
```js
{ _id, userId, projectId, type: "full"|"regenerate_scene"|"render",
  status: "queued"|"running"|"succeeded"|"failed"|"cancelled",
  stages: [{ name, status, startedAt, endedAt, provider, model,
             tokensIn, tokensOut, costUsd, error?, outputRef }],
  promptVersion, creditsHeld, creditsCharged, costUsdTotal, attempts,
  createdAt, updatedAt }
```
Indexes: `{userId:1, createdAt:-1}`, `{status:1, createdAt:1}`.

### renders
```js
{ _id, userId, projectId, jobId, format, resolution: "720p"|"1080p", watermark: Boolean,
  assetId, durationMs, status, createdAt }
```

### connected_accounts
```js
{ _id, userId, provider: "instagram", igUserId, username, pageId,
  accessTokenEnc, tokenIv, tokenTag, tokenExpiresAt, scopes: [], status: "active"|"expired"|"revoked",
  createdAt, updatedAt }
```
Indexes: `{userId:1, provider:1}` **unique** (one Instagram account per user in V1); `{tokenExpiresAt:1}` for refresh job. Tokens never leave the server.

### scheduled_posts
```js
{ _id, userId, projectId, renderId, connectedAccountId, caption, hashtags: [],
  scheduledAt (UTC), timezone, status: "scheduled"|"publishing"|"published"|"failed"|"cancelled",
  igContainerId?, igMediaId?, attempts, lastError?, publishedAt? }
```
Indexes: `{status:1, scheduledAt:1}`, `{userId:1, scheduledAt:-1}`.

### credit_ledger (append-only)
```js
{ _id, userId, type: "grant"|"purchase"|"hold"|"charge"|"release"|"refund"|"expire",
  amount: Number (+/-), refJobId?, refSubscriptionId?, balanceAfter, note, createdAt }
```
Indexes: `{userId:1, createdAt:-1}`. Balance = last `balanceAfter`; `users.creditsBalance` is a cache updated in the same transaction (Mongo multi-document transaction).

### subscriptions
```js
{ _id, userId, plan, provider: "stripe"|"razorpay", providerCustomerId, providerSubId,
  status, currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt }
```

### project_versions
```js
{ _id, userId, projectId, version, kind: "script"|"storyboard"|"composition", data: {}, createdBy: "ai"|"user", createdAt }
```
`composition` data is the `composition.json` rendered by Remotion.

### audit_logs
```js
{ _id, userId, action, ip, userAgent, meta, createdAt }  // TTL 1 year
```

## 3. Relationships
`users 1─N projects 1─N scenes`; `projects 1─N assets/renders/generation_jobs/project_versions`; `renders 1─N scheduled_posts`; `users 1─1 connected_accounts (instagram)`; `users 1─N credit_ledger`.
References by `ObjectId`; embedded for tightly coupled data (stages inside jobs, timestamps inside scenes).

## 4. Isolation and security
- Repository functions: `projects.findById(userId, id)` always filters `{_id, userId}`. A lint/test fails any query without `userId`.
- Cross-user tests: user A requests user B's id → 404.
- Atlas: IP allow-list, TLS, encryption at rest, least-privilege DB user, daily backups, point-in-time restore.
- Field-level encryption for `accessTokenEnc` (AES-256-GCM with app key from secrets manager).
- Soft delete (`deletedAt`) then purge job (30 days) removes docs and storage objects; supports account deletion (DPDP/GDPR).

## 5. Credits and consistency
1. On generate: transaction → insert `hold`, decrement cache; reject if insufficient.
2. Success: `charge` finalizes hold; failure: `release` returns credits.
3. Idempotency key on job creation prevents double charge.
4. Monthly plan grant by scheduled job (`grant`); unused credits expiry policy TBD.

## 6. Retention
| Data | Retention |
|---|---|
| Free-plan renders/assets | 90 days |
| Paid | While subscribed + 30 days |
| Job logs | 180 days |
| Audit logs | 1 year (TTL index) |

## 7. Why MongoDB works here (and trade-offs)
- Good: flexible JSON (storyboards, composition), simple scaling, easy to store pipeline outputs.
- Trade-offs vs Postgres: no row-level security (we enforce in code), credits need multi-document transactions (needs Atlas replica set, which it provides), reporting is harder (use Atlas Charts or export to analytics later).

## 8. Open items
- Credit expiry policy; free-plan monthly credit amount.
- Team/workspace model for V2 (`workspaceId` on all docs).
- Search over projects (Atlas Search) if library grows.
