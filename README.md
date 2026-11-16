# Recalro — standalone product prototype

A responsive Recalro prototype built with semantic HTML, CSS and vanilla JavaScript. The project includes a marketing landing page and an interactive learning workspace.

## Run locally
No build step or package installation is required.
1. Unzip the folder.
2. Open `index.html` in a modern browser, or run the included server:
   - `npm run dev`
   - Visit `http://localhost:8000`

## Brand system
- App (signed-in experience): teal `#14A09F` (primary actions, progress, navigation), orange `#F77503` (XP, streaks, achievements, rewards), light background `#F8FAFA`, dark background `#151C20`, secondary text `#899395`. Tokens live at the top of `app/app.css`.
- Contrast: white text on `#14A09F` is 3.2:1 and `#F77503` text on white is 2.8:1, both below WCAG AA for body text. Buttons therefore use the deeper `--teal-600` (`#0B7C7B`, 5.0:1), small orange text uses `--orange-ink` (`#B85500`), and `#899395` is reserved for non-essential meta text.
- Subject colours are a validated colour-blind-safe categorical palette (`--s0`–`--s3`), with separate light and dark values.
- Marketing and auth pages use the same approved palette (`--mk-*` tokens in `marketing.css`, `--au-*` in `auth.css`). Filled buttons are teal-600; orange is kept for accents (the arrow disc on primary CTAs, streaks, XP, highlights).
- Manrope headings, DM Sans interface text. Logo: `assets/recalro-logo.png`.

## Signed-in application
The app is plain JavaScript modules with no build step, loaded in order from `index.html`:

| File | Responsibility |
|---|---|
| `app/core.js` | Sample course content, local store (`recalro-app-v2`, migrates the old `recalro-demo-v1` data), local SM-2 scheduler, XP/levels/streaks, daily quests, weekly challenges, achievements, insights and recommendations |
| `app/ui.js` | Icons, components, dialogs, toasts, tooltips, charts and reward animations (Web Animations API, respects reduced motion) |
| `app/shell.js` + `shell.css` | `AppShell`: hash router (`#/app/<page>`), `DesktopNavigationRail` (grouped accordion; collapses to one icon per group with side panels; forced rail on tablets), `MobileBottomNavigation` (Home · Learn · Practice · AI Tutor · More, hidden while the keyboard is open or in focus mode), `MobileNavigationHub` (full-screen More), notifications/account as sheets, command palette (Ctrl/⌘ K), theme |
| `app/sheets.js` | `R.sheet` (bottom sheet on phones, side panel on desktop, full-screen hub), `R.picker` (searchable selection), and automatic replacement of every native `<select>` with a picker; there are no dropdown menus |
| `app/tutor.js` + `tutor.css` | AI Tutor workspace: collapsible conversation history (full-screen on phones), subject selector, Markdown/maths/table/code rendering, copy · regenerate · feedback · retry · stop · continue, follow-up prompts, composer with image attachments, and the 3-step Explain-it workspace |
| `app/review.css` | Flashcard review session (focus mode, 3D flip, rating feedback, completion screen) and app-wide learning motion |
| `app/pages-*.js` | Pages: home & insights, learning, study tools, community/rewards/account |
| `app.js` | Marketing page, Supabase authentication, bridge into the app, deep links |

Navigation groups: Overview · My Learning (Subjects, Roadmap, Planner, Vault) · Study Tools (Flashcards, Review Center, Quick Practice, Exam Simulator, AI Tutor with Explain-it-to-me, Summaries with Read-aloud) · Insights (Analytics, Weakness Detector, Memory Center, Exam Readiness, Weekly Reports) · Community (Groups, Challenges, Leaderboards) · Rewards (Daily Quests, Achievements, Store) · Account (Profile, Settings).

### What is real vs. sample
- **Computed from your activity in this browser:** XP, level, streak, accuracy, study time (estimated per activity), mastery, review schedule, forgetting curve, readiness, weak topics, recommendations, quests, challenges, achievements, weekly reports.
- **Sample content (labelled in the UI):** the three starter subjects with their cards, vault items and questions; study-group members and activity; league peers.
- **Not connected:** AI provider (the tutor searches your own cards and vault instead), document processing (only `.txt`/`.md` files are read locally), email, real accounts and sync, server-verified rewards.

### Integration points
- Authentication: `app.js` (`readSession`, `writeSession`, `signOut`, exposed as `window.RecalroAuth`).
- Persistence: `R.save` / `R.state` in `app/core.js`. Swap for API calls per entity.
- SM-2: `nextState` / `R.rateCard` in `app/core.js`. Replace with the backend scheduler.
- AI tutor: `composeAnswer()` in `app/tutor.js` builds answers locally from the student's cards, vault and review history and says the provider isn't connected. Replace it with the provider call and pass streamed Markdown to `revealAnswer()`. Response feedback (thumbs) is stored locally on each message.
- Summaries: `summarize()` in `app/pages-study.js`.
- Exam questions and pass threshold: `R.content.questions` and the 70% practice target in `app/pages-study.js`.
- Leagues, groups and reward payouts: `R.league`, `C.groups`, `C.peers` in `app/core.js`.

## Marketing page components
No build step and no animation library: components are small vanilla modules on `window.RecalroMarketing` / `window.RecalroMotion`, styled with CSS transitions and the Web Animations API. Everything checks `prefers-reduced-motion`.

| File | Components |
|---|---|
| `marketing/nav.js` + `nav.css` | `MarketingNavbar`: desktop links with sliding indicator and scroll-spy, Features mega-menu (click, hover-intent, arrow keys, Esc), sticky shrink, dedicated mobile sheet on `<dialog>` |
| `marketing/motion.js` | `AnimatedHeadline`, `RevealOnScroll`, `StaggerContainer`, `AnimatedCounter`, `AnimatedProgress`, cancellable `wait` |
| `marketing/story.js` | `ScrollStory`: 7-stage "How it works" journey with a sticky stage on wide screens and inline scenes on mobile; never intercepts scrolling |
| `marketing/demos.js` + `sections.css` | `FeatureTheatre` with interactive demos: AI Tutor, Flashcards, Knowledge Vault, Forgetting Curve, Exam Simulator, Study Groups, Gamification. Demos run only while visible; all content is sample data and labelled |
| `app.js` | Hero `InteractiveFlashcardPreview` (question → flip → rating → XP → progress → tutor feedback) |

Mega-menu items link to the matching demo (`#demo-<id>`) or story stage (`#story-<n>`).

## Signup wizard (frontend prototype)
`auth/signup-wizard.js` replaces the old single signup form with an 8-step journey: Account details → Email confirmation link → Academic path → Academic details (conditional per path) → Learning interests → Learning goals → Review → Welcome.
- `auth/signup-components.js`: `FormField`, `SelectField`, `PasswordField` + `PasswordStrengthIndicator`, `SelectionCard`, `Chip`, `ChoiceGroup`, `OTPInput` (auto-advance, backspace, paste, autofill), `InstitutionSearch` (ARIA combobox with "not listed" fallback).
- `auth/signup-data.js`: paths, countries, **sample** institution lists, levels (100–600 Level for Nigeria), classes, exams, certifications, interests, goals.
- State is in memory for the session only; going back keeps answers, editing from Review returns to Review. Passwords are never stored.
- **Simulated:** Google button (shows a prototype notice), Terms/Privacy (dialog says they're not published yet). When Supabase is configured, the review step creates a real email/password account and Supabase sends its confirmation link; without configuration, signup stays in local demo mode.
- Integration points: `ProfileReviewStep.beforeNext` (create account), `complete()` (save profile and onboarding state).

## Past Questions (EKSU) and the CBT
Route `#/app/pastq` (Study Tools → Past Questions; the phone Practice tab covers it).
- `app/pastq-data.js`: institution config and a **demonstration** bank: 40 original practice questions arranged like EKSU 100-level first-semester courses (MTH 101, PHY 101, CHM 101, GST 111). **None of them is an official EKSU past question.** The UI labels every collection and question as demo practice, and says Recalro is not affiliated with or endorsed by EKSU. No university logo is used.
- `app/pastq.js` + `pastq.css`: dashboard (performance from real activity, recent attempts, readiness only after 20 answers), searchable library with filters (level, semester, faculty, department, session), setup, CBT workspace, results and answer review.
- **Practice mode:** check each answer, see your answer vs the correct one, a structured explanation (concept, formula, given values, working, result, why your option is wrong, common mistake) and an optional similar-questions session on the same topic, which returns you to the main flow afterwards.
- **Exam mode:** optional timer (auto-submits at zero), no answers revealed, flagging, answer changes, navigator (side panel on desktop, sheet on phones), submission confirmation, then results with a full review (all / incorrect / flagged) and "Practise my mistakes".
- Progress is stored locally in `R.state.pastq.attempts`, and each answer is logged as activity type `pastq` (counts toward XP, streaks and study time).

### Question-bank contract (backend work, not part of this frontend)
Replace `window.RecalroPastQ` with an API returning the shapes documented at the top of `app/pastq-data.js` (Institution, Collection, Question). Required before launch:
1. A verified question bank with provenance per question (`source.kind: "past"`, `verified: true`, exam year/paper). Only those may be labelled "past question".
2. Permission or licensing for any reproduced examination content.
3. Server-side storage for attempts and answers so progress syncs across devices.
4. Optional: server-side "similar question" matching (the prototype matches by topic).

No approved paper source has been provided yet. The future import flow must run only when an admin explicitly selects an approved source and starts a pull. It should retain source URL and licence details, extract or scan the paper, review the question text and diagrams, then publish a clean readable Recalro-watermarked copy matched to institution, level, department, course and year. Download access remains disabled until a payment gate is implemented; the demo bank is for practice only.

## Theme system
Light (default), Dark and System are in Settings → Appearance. Marketing stays light; auth and workspace follow the learner's choice. An inline script in `index.html` applies it before first paint, and System follows live OS changes. Text on filled colours uses semantic tokens (`--on-teal`, `--on-orange`, `--on-status`).

## Mobile behaviour
- Phone bottom bar (`SmartMobileNavigation` in `app/shell.js`): visible on load and near the top, slides away while scrolling down, returns on scroll-up or after a short pause. It is hidden during focused activities (flashcard review, CBT) and while the keyboard is open. Celebrations wait until a focused activity ends.
- Marketing page on phones: no hero video, poster or photographs (none are downloaded); text cards replace the photo bento; product demos stay. The page canvas colour follows the scroll position, so iOS overscroll never shows a mismatched band; safe-area insets are respected.

## Marketing media
The hero video, its poster, and marketing photos are bundled under `assets/`, so the page does not depend on third-party media hosts at runtime. The hero video is the Pexels clip by Kampus Production, served locally as optimized 1080p H.264 (the original 4K download was 8.6 MB; the optimized clip is about 3.5 MB):
- `hero-study-video-optimized.mp4` and `hero-study-poster.jpg` — [Pexels video 5939924](https://www.pexels.com/video/man-and-woman-using-a-laptop-in-a-library-5939924/)

The marketing photos were downloaded from these Pexels photo sources:
- `hero-study.jpg` — Pexels photo 5212345
- `study-process.jpg` — Pexels photo 6281016
- `feature-tutor.jpg` — Pexels photo 16420237
- `feature-vault.jpg` — Pexels photo 8199759
- `community-study.jpg` — Pexels photo 16420473
- `feature-spaced-repetition.jpg` — Pexels photo 7128774
- `feature-roadmap.jpg` — Pexels photo 19915780
- `feature-exam-readiness.jpg` — Pexels photo 7128752
- `feature-progress.jpg` — Pexels photo 7972741

The calendar, map pin, target, trophy, notebook and computer 3D icons are from [3dicons](https://3dicons.co/) and are released under [CC0 1.0](https://github.com/realvjy/3dicons/blob/develop/LICENSE). They are used in feature cards, study steps and workspace navigation; other utility glyphs use raised, dimensional icon tiles to keep the visual treatment consistent.

## Important implementation boundary
The app supports Supabase email/password authentication, per-user profiles and cloud sync for learner state. Supabase configuration and the database migration are required before those features work. Tutor, transcription and speech routes use the configured OpenAI provider and require a valid Supabase session. Browser local storage remains the offline cache. The local SM-2 scheduler, sample content, sample peers and some learning helpers are still prototype features; sample analytics are demonstration data.

Before production:
1. Review and apply the Supabase migration for the target project.
2. Move large chat/material collections out of the single JSONB state row if their size or query needs grow.
3. Connect subject/material uploads and generated content to dedicated backend APIs.
4. Verify exam question limits and pass threshold with the backend.
5. Add production monitoring, rate limits, accessibility review and cross-device QA.
## Files
- `index.html` - marketing site, auth screen and app mount point
- `marketing.css`, `auth.css` - marketing and auth styles
- `marketing/` - navbar, motion primitives, scroll story, feature demos
- `auth/` - signup wizard, its components and option data
- `app/` - signed-in application (see above)
- `app/supabase.js`, `app/cloud-sync.js` - Supabase client setup and state sync
- `supabase/migrations/` - profile/state tables and per-user RLS policies
- `app.js` - marketing interactions, authentication and app bridge
- `assets/recalro-logo.png` - supplied logo artwork

## Supabase and AI setup

The AI Tutor connects through the included Node.js server. The OpenAI key is read only by the server and must never be placed in browser JavaScript.

1. Install Node.js 20.12 or newer.
2. Copy `.env.example` to `.env` in the project root (the same folder as `package.json`).
3. Set `OPENAI_API_KEY` in `.env`. Keep it server-side; never put it in browser JavaScript or share it in chat.
4. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_ANON_KEY` is also accepted for older projects. Do not use a Supabase secret/service-role key in this app config.
5. In Supabase, enable email/password sign-up with email confirmations. Add `http://localhost:8000/**` to the Auth redirect URL allowlist for local development; set the production Site URL and add its exact redirect URL before deploying.
6. Apply `supabase/migrations/0001_profiles_and_learning_state.sql`, then `supabase/migrations/0002_usernames.sql` in the Supabase SQL Editor. They create private profile/app-state tables and reserve unique usernames at sign-up, including before email confirmation.
7. Run `npm run dev` and open `http://localhost:8000`.

New sign-ups create a Supabase account at the review step. Supabase sends its configured confirmation link to the learner's email; the link returns to Recalro and opens the learning space. Signed-in learner state is synced to `public.user_app_state`; profile and onboarding data are stored in `public.profiles`. Existing local state is uploaded for a new account when no remote state exists. When switching between accounts, the app loads that account's cloud state and clears the previous account's local state from the active view.

University and postgraduate institution search uses the [ROR global organization registry](https://ror.readme.io/docs/api-query) through `/api/institutions`, with a local sample fallback and a manual entry option. Secondary school names are entered directly because ROR focuses on research organizations. Real country, school, level and course details are requested so future verified papers can be matched accurately. Profile photos are resized to 256 px JPEGs and saved with learner state. Notifications are in-app only: due-card reminders are checked when the workspace opens, and weekly report reminders appear on Sundays. Email and device push delivery are not connected.

The app loads `supabase-js` v2 from jsDelivr only when Supabase is configured. Keep the OpenAI key server-side. The AI routes validate the Supabase access token before calling OpenAI. Tutor, voice and file analysis also require outbound network access from the Node server.

Optional model overrides: `OPENAI_TUTOR_MODEL` (default `gpt-4.1-mini`), `OPENAI_TRANSCRIBE_MODEL` (default `gpt-4o-mini-transcribe`) and `OPENAI_TTS_MODEL` (default `gpt-4o-mini-tts`). Uploads are limited to 12 MB. DOCX extraction reads the main document body; complex layout, headers, footers and embedded images may not be preserved.
