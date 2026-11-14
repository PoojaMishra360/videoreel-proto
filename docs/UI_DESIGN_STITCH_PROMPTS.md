# VideoReel.ai — UI Design Brief & Google Stitch Prompts

How to use: open stitch.withgoogle.com → New project → choose **Web** → paste **Master Prompt** first (sets the style) → then paste one **Screen Prompt** at a time. Use "Redesign"/edit prompts to refine. Export to Figma or copy the code.

## Design system (reference)
- Style: clean, modern, friendly SaaS. Light theme first, dark theme later.
- Colors: primary violet `#6D4AFF`, accent coral `#FF6B5B`, background `#F7F7FB`, surface white, text `#14142B`, success `#16A34A`, warning `#F59E0B`, error `#DC2626`.
- Font: Inter (UI), Noto Sans Devanagari for Hindi previews.
- Radius 12–16px, soft shadows, generous whitespace, large single-purpose CTAs.
- Principle: **one input, one button**. Minimal steps.

## Master Prompt (paste first)
Design a modern, minimal web SaaS called "VideoReel" — an AI platform where educators, coaches and course creators type one topic and get a finished explainer video with voice-over and captions. Style: clean, friendly, light theme, violet (#6D4AFF) primary, coral accent, Inter font, rounded cards (16px), soft shadows, lots of whitespace. Desktop-first, responsive. Focus on simplicity: one input, one big "Generate video" button. Use realistic educational sample content (e.g. "How does photosynthesis work?").

## Screen 1 — Landing page
Landing page for VideoReel. Hero: headline "Turn any topic into an explainer video in minutes", subtext "Type an idea. Get script, visuals, voice-over and captions — ready to post.", a topic input with "Generate video" button, and a 60-second sample vertical video mockup on the right. Sections: how it works (3 steps: Enter topic → AI creates → Export or post to Instagram), formats (9:16, 1:1, 16:9), languages (English, Hindi, Tamil, Bengali…), features grid, pricing preview (Free, Creator $19, Pro $49, Team $129), testimonials, FAQ, footer.

## Screen 2 — Sign up / Login
Centered auth card: "Continue with Google" button, email + password fields, link between login and sign up, short benefit list on the left panel with an illustration. Include a "12 free credits, no card needed" badge.

## Screen 3 — Dashboard (home)
App dashboard with left sidebar (Home, My Videos, Schedule, Instagram, Brand Kit, Billing, Settings) and top bar with credits balance and avatar. Main area: a large "What do you want to teach today?" input with language, duration (30/60/90s) and format selectors and a "Generate video" button; below, "Recent videos" grid of cards with thumbnail, title, status chip (Ready, Generating, Failed), date; empty state with example topic chips.

## Screen 4 — New video options
Expanded create panel/modal: topic text area, audience level (Beginner/Intermediate/Advanced), language dropdown, duration slider (30–90s), format selector with 3 visual cards (Vertical 9:16, Square 1:1, Horizontal 16:9), voice picker with play-sample buttons, captions toggle, credit cost estimate ("6 credits"), primary "Generate video".

## Screen 5 — Generation progress
Full-page progress view for "How does photosynthesis work?". Vertical stepper showing live stages: Checking topic, Researching, Writing script, Fact-checking, Storyboard, Creating images, Recording voice-over, Rendering video — each with status icon and time; a progress bar with "About 4 min left"; a live preview of the script appearing; cancel button; note "You can leave this page, we'll email you."

## Screen 6 — Video preview & editor
Editor screen. Center: video player (vertical 9:16 mock) with play controls and format switcher tabs. Left: scene list with thumbnails and narration text (editable), drag to reorder, regenerate scene button. Right panel tabs: Captions (style, font, size, color, position), Voice (voice, speed), Music (track, volume), Brand (logo, colors). Bottom timeline with scene blocks and waveform. Top-right: "Export MP4" and "Post to Instagram" buttons. Show a "Saved" indicator and credit cost of re-render.

## Screen 7 — Export dialog
Modal: choose formats (checkboxes 9:16, 1:1, 16:9), resolution (720p / 1080p), include captions burned-in toggle, download MP4 button with progress, success state with thumbnail, copy-link, and "Schedule to Instagram" secondary action. Show watermark notice for Free plan with upgrade link.

## Screen 8 — Instagram connect
Page "Connect Instagram": explanation card (Business/Creator account required), "Connect Instagram" button, steps list, privacy note "Your account stays private to you. We never post without your approval", connected state showing @username, avatar, status "Connected", disconnect button, token expiry notice.

## Screen 9 — Schedule post
Schedule page: left, calendar (month/week) with scheduled posts as chips; right, form with video selector, caption text area with AI "Suggest caption + hashtags" button, hashtag chips, date and time picker with timezone, "Post now" and "Schedule" buttons, preview of an Instagram Reel frame. List below of upcoming/published/failed posts with status badges and retry.

## Screen 10 — My Videos library
Grid/list toggle, search, filters (status, language, format, date), video cards with hover preview, kebab menu (Duplicate, Download, Schedule, Delete), bulk select.

## Screen 11 — Pricing & billing
Pricing page with monthly/yearly toggle (save 20%) and 4 plan cards (Free, Creator, Pro, Team) with credits, resolution, watermark, Instagram scheduling, languages; highlight Creator as popular. Billing page: current plan, credits usage bar, invoices table, payment method, upgrade button, buy extra credits.

## Screen 12 — Settings
Tabs: Profile, Language & defaults, Notifications, Security, Delete account. Simple forms with save buttons.

## Screen 13 — Mobile views
Mobile versions of Dashboard, Generation progress, and Video preview with bottom navigation (Home, Videos, Create, Schedule, Profile).

## Key states to request in Stitch
Empty states, loading skeletons, error ("Generation failed — credits refunded. Retry"), low-credits banner, offline, Free-plan upgrade nudges.

## Tips
- Generate screens one at a time; keep the Master Prompt in the same project so style stays consistent.
- After each screen: "Make it more minimal", "Increase spacing", "Use the violet primary on the main CTA only".
- When happy, export to Figma and share the link with me so I can match the frontend to it.
