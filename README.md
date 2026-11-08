# Recalro — standalone product prototype

A responsive Recalro prototype built with semantic HTML, CSS and vanilla JavaScript. The project includes a marketing landing page and an interactive learning workspace.

## Run locally
No build step or package installation is required.
1. Unzip the folder.
2. Open `index.html` in a modern browser, or run the included server:
   - `npm run dev`
   - Visit `http://localhost:8000`

## Brand system
- Teal: `#4A9E9E` (primary)
- Orange: `#E77D31` (secondary)
- Neutral backgrounds and surfaces
- Manrope headings, DM Sans interface text
- Official Recalro graduation-cap R artwork is in `assets/recalro-logo.png`.

The exact color values are sampled from the supplied brand reference image. If you have official brand hex values, update the CSS custom properties at the top of `styles.css`.

## Included experience
- Marketing homepage with the requested locally hosted Pexels hero video, a matching poster, sticky navigation, and responsive sections.
- Responsive desktop/mobile navigation and workspace.
- Dashboard, subjects, roadmap, flashcards, memory center, knowledge vault, AI tutor, exam simulator, summaries, read-aloud, weakness detector, planner, readiness, quests, leaderboards, study groups, reward store, explain-it-to-me, weekly reports and settings.
- Working UI interactions: responsive navigation, dark/light toggle, flashcard review, knowledge search/filter/favorites, multi-question timed or untimed demo exams, browser speech synthesis, local summary drafts, explanation practice feedback, chat prototype, quests, study groups, rewards, and workspace exports.
- Add subjects, milestones, study blocks, vault notes, quests, and groups with in-page forms. Demo progress and preferences persist in this browser using local storage.
- Responsive checks cover the marketing site and workspace pages at 320, 375, 425, 768, 1024, 1280, 1440, and 1920 pixels; no horizontal overflow was found after refinement.

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
- `index.html` — marketing site and app shell
- `styles.css` — responsive design system and components
- `app.js` — navigation, demo data and interactions
- `assets/recalro-logo.png` — supplied logo artwork
