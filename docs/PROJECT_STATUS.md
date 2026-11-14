# VideoReel Project Status

**Last updated:** 2026-11-11
**Current phase:** End-to-end video prototype
**Status:** In progress

This file is the running project progress log. Update the status and change log whenever a project feature is added, changed, validated, or unblocked.

## Current milestone: Database foundation

| Area | Status | Notes |
|---|---|---|
| Dashboard and create form | Live generation | Authenticated create requests call the generation API; explicit preview mode is labeled sample-only. |
| Generation progress | Live job status | UI polls persisted job stages and progress from MongoDB. |
| Video preview/editor | Live generated MP4 | Completed jobs return the user's script, research sources, and owner-checked byte-range MP4 URL. |
| My videos library | Done (UI preview) | Sample projects, search, status filter, and mock project actions. |
| Email/password authentication | Verified | Signup, 12-credit grant, session lookup/persistence, login, and logout/revocation pass `npm run auth:smoke`; disposable test data is cleaned automatically. |
| Email verification, password reset, Google OAuth | Not started | Requires an email delivery provider and OAuth credentials. |
| Billing, settings, Instagram, schedule, brand kit | Preview screens | Interactions are placeholders; no external integrations or account data. |
| MongoDB foundation | Connected and initialized | `npm run db:setup` ensured 16 collections and indexes; a MongoDB ping succeeded. |
| Cloudflare R2 | Connected | S3-compatible private bucket client and namespaced signed upload/download helpers are implemented. `npm run storage:check` successfully reached the configured bucket. |
| Script-to-video pipeline | Live UI/API flow (AI images/music/full QA pending) | UI launches the existing CLI with the submitted topic/options; jobs and progress are user-scoped in MongoDB. |
| Editor video playback | Connected | Editor play button loads the latest local MP4 into native browser controls; server supports byte ranges for seeking. |
| Backend/API integration | Partial | Auth/signup, credit reserve/release, generation jobs, progress, and protected video delivery are integrated; remaining workspace sections still use previews. |
| Automated UI tests | Not started | Verified manually in browser; syntax and existing TypeScript checks pass. |

## Run the UI preview

For a safe UI-only preview that never contacts MongoDB, run `npm run ui:preview`, then open `http://127.0.0.1:4173`.

`npm run ui` enables real auth routes and must only be used after rotating the exposed Atlas password and updating `.env`.

- Dashboard: `/`
- Sign in: `/login` or `/?auth=login`
- Sign up: `/signup` or `/?auth=signup`

Sign-in and sign-up use the local API and MongoDB. The Atlas password was exposed and must be rotated before further use. After updating local `.env`, run `npm run db:setup`; do not enter real credentials before that is done.

## MongoDB setup

`MONGODB_URI` and `MONGODB_DB=videoreel` are now set in the ignored local `.env`. The credential was shared in chat, so rotate the Atlas database-user password and update the URI before connecting. Then run `npm run db:setup` to create the initial collections and indexes listed in the database design.

## Cloudflare R2 setup

Create a private R2 bucket and an R2 API token scoped to that bucket with object read/write permissions. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET` in the ignored local `.env`. Run `npm run storage:check` to verify access. The check performs only `HeadBucket`; it does not upload or delete objects.

## Generate a video

Run `npm run gen -- "What is JavaScript?" --duration=30 --level=beginner --format=9:16`. Provider calls may incur usage. Set `LLM_PROVIDER=gemini` to bypass OpenAI; set `VOICE_PROVIDER=system` to use Windows speech instead of ElevenLabs. The run folder contains the script, `composition.json`, narration WAV or MP3, captions SRT, rendered `out.mp4`, `thumbnail.png`, and `report.json`. For a provider-free local timing/render check, run `npm run video:smoke`.

## Requirements references

- Product requirements: `PRD.md`
- System architecture: `SYSTEM_DESIGN.md`
- Screen design brief: `UI_DESIGN_STITCH_PROMPTS.md`

The UI now creates live user-scoped generation jobs and plays their rendered MP4s. Library history, email verification, password reset, Google OAuth, billing, background music, AI-generated visuals, and full render QA remain incomplete.

## Change log

| Date | Progress | Validation |
|---|---|---|
| 2026-11-11 | Added responsive UI prototype for dashboard/create, generation progress, editor/preview, library, billing, settings, schedule, Instagram, and brand kit. | Opened local UI in browser; exercised topic submission, progress flow, editor, and navigation. |
| 2026-11-11 | Added the MongoDB Node.js driver, environment-variable documentation, safe connection helper, and repeatable collection/index setup script. | JavaScript syntax and TypeScript checks pass. Live setup awaits a rotated Atlas credential in `.env`; the setup command safely reports the missing URI without attempting a connection. |
| 2026-11-11 | Added the supplied MongoDB URI and database name to the ignored local `.env`. | Confirmed the setting without printing it. |
| 2026-11-14 | Implemented email/password signup, sign-in, logout, `/me` session lookup, scrypt password hashes, Mongo-backed hashed session tokens, 7-day HttpOnly cookies, basic IP-based throttling, and private workspace plus welcome-credit creation. Protected UI now checks the session before display. | Password hash/verify test and syntax/type checks pass. One `/me` request reached Atlas; the temporary server was stopped. Signup, sessions, and index setup are not verified. Rotate the exposed Atlas password before further use. |
| 2026-11-14 | Added `npm run ui:preview`, which bypasses auth checks, blocks auth API requests before MongoDB access, and warns against entering credentials. | Verified dashboard and sign-in route in browser; `/api/config` reports preview mode. No database request was made by preview mode. |
| 2026-11-14 | Added Cloudflare R2 S3 client, private project asset key helpers, signed upload/download URLs, and a non-destructive bucket check command. | JavaScript syntax and TypeScript checks pass. `npm run storage:check` succeeded; the configured bucket is reachable. |
| 2026-11-14 | Connected the CLI fact-checked script to ElevenLabs word-timed narration, sentence motion scenes, burned-in captions, SRT output, a Remotion/FFmpeg MP4 render, and a PNG thumbnail. Added a synthetic-audio smoke test covering alignment, timeline, captions, render, and thumbnail. | `npm run video:smoke` passed; `ffprobe` confirmed a 2.00 second MP4 and non-empty thumbnail. No paid provider calls were made. |
| 2026-11-14 | Added Windows `System.Speech` as a selectable local voice provider and a saved-script render command. Completed the live JavaScript run after provider limits blocked the first voice attempt. | Gemini completed moderation through fact-check with transient 503/504 retries; ElevenLabs returned 402. Reused the saved script with local speech; produced and probed a 36.50s 1080x1920 H.264/AAC MP4, WAV narration, SRT, and PNG thumbnail. |
| 2026-11-14 | Retried a fresh topic-to-video run with Gemini and local voice selected. | Gemini repeatedly returned 503/504 during script generation; stopped the duplicate retry after about 7 minutes. The earlier completed MP4 remains valid. |
| 2026-11-14 | Connected the editor play button to the latest rendered MP4 using a local media route with byte-range support. | Browser loaded the 36.5s MP4, metadata parsed, playback advanced, and an HTTP range request returned 206 with 32 bytes. |
| 2026-11-14 | Added `npm run auth:smoke` for disposable end-to-end auth verification. | Signup, welcome credits, session lookup, logout revocation, login, and session persistence all passed against MongoDB; test records were removed. |
| 2026-11-14 | Replaced the UI's simulated generation timer with authenticated generation APIs, persistent user-scoped jobs, credit reservation/release, progress polling, and protected byte-range video delivery. Added a Node.js topic-match fix. | Live disposable-account generation for “What is Node.js?” passed with output title “Understanding Node.js”; the protected video route returned HTTP 206. The test account, job, credits, and files were removed. |

## Next steps

1. Add AI-generated scene images, licensed background music, and full render QA.
2. Add email verification, password reset email delivery, and Google OAuth.
3. Connect remaining library, settings, and asset flows to MongoDB/R2.
4. Add billing checkout and production credit accounting.
6. Add billing checkout and production credit accounting.
