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
- Marketing and auth pages still use the earlier `#4A9E9E` / `#E77D31` values in `marketing.css` and `auth.css`.
- Manrope headings, DM Sans interface text. Logo: `assets/recalro-logo.png`.

## Signed-in application
The app is plain JavaScript modules with no build step, loaded in order from `index.html`:

| File | Responsibility |
|---|---|
| `app/core.js` | Sample course content, local store (`recalro-app-v2`, migrates the old `recalro-demo-v1` data), local SM-2 scheduler, XP/levels/streaks, daily quests, weekly challenges, achievements, insights and recommendations |
| `app/ui.js` | Icons, components, dialogs, toasts, tooltips, charts and reward animations (Web Animations API, respects reduced motion) |
| `app/shell.js` | Grouped, collapsible navigation, hash router (`#/app/<page>`), top bar with streak/gem/XP chips, notifications, command palette (Ctrl/⌘ K), theme, mobile tab bar |
| `app/pages-*.js` | Pages: home & insights, learning, study tools, community/rewards/account |
| `app.js` | Marketing page, demo authentication, bridge into the app, deep links |

Navigation groups: Overview · My Learning (Subjects, Roadmap, Planner, Vault) · Study Tools (Flashcards, Review Center, Quick Practice, Exam Simulator, AI Tutor with Explain-it-to-me, Summaries with Read-aloud) · Insights (Analytics, Weakness Detector, Memory Center, Exam Readiness, Weekly Reports) · Community (Groups, Challenges, Leaderboards) · Rewards (Daily Quests, Achievements, Store) · Account (Profile, Settings).

### What is real vs. sample
- **Computed from your activity in this browser:** XP, level, streak, accuracy, study time (estimated per activity), mastery, review schedule, forgetting curve, readiness, weak topics, recommendations, quests, challenges, achievements, weekly reports.
- **Sample content (labelled in the UI):** the three starter subjects with their cards, vault items and questions; study-group members and activity; league peers.
- **Not connected:** AI provider (the tutor searches your own cards and vault instead), document processing (only `.txt`/`.md` files are read locally), email, real accounts and sync, server-verified rewards.

### Integration points
- Authentication: `app.js` (`readSession`, `writeSession`, `signOut`, exposed as `window.RecalroAuth`).
- Persistence: `R.save` / `R.state` in `app/core.js`. Swap for API calls per entity.
- SM-2: `nextState` / `R.rateCard` in `app/core.js`. Replace with the backend scheduler.
- AI tutor: `reply` in the tutor page (`app/pages-study.js`). Stream provider output into `stream()`.
- Summaries: `summarize()` in `app/pages-study.js`.
- Exam questions and pass threshold: `R.content.questions` and the 70% practice target in `app/pages-study.js`.
- Leagues, groups and reward payouts: `R.league`, `C.groups`, `C.peers` in `app/core.js`.

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
This is a self-contained frontend prototype, not a connected production application. It does not include authentication, Supabase, FastAPI, server-side database persistence, AI provider calls, server-side file processing, production SM-2 scheduling, or verified XP/gem transactions. Browser local storage is not account storage and may be cleared by the user or browser. Summary and explanation helpers are local demos, not AI output or verified academic assessment. UI examples and sample analytics are demonstration data. Do not present them as real user records.

Before production:
1. Connect authentication and account settings to the existing identity provider.
2. Map all existing routes, API contracts and database entities before replacing an existing app.
3. Connect subject/material uploads, AI extraction and generated content to backend APIs.
4. Wire flashcard ratings to the existing SM-2 implementation without changing its calculations.
5. Connect AI Tutor, summaries and explain-it-to-me to configured AI providers.
6. Verify exam question limits and pass threshold with the backend.
7. Persist roadmap, planner, knowledge vault, quests, groups and reward economy through approved backend work.
8. Add automated tests, accessibility audit and cross-device QA.

## Files
- `index.html` — marketing site, auth screen and app mount point
- `marketing.css`, `auth.css` — marketing and auth styles
- `app/` — signed-in application (see above)
- `app.js` — marketing interactions, demo auth and app bridge
- `assets/recalro-logo.png` — supplied logo artwork
