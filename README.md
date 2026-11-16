# Recalro

Recalro is a responsive learning workspace built with semantic HTML, CSS and vanilla JavaScript. Learners can create subjects and study materials, review flashcards, track learning activity, and use the AI Tutor.

## Run locally

1. Install Node.js 20.12 or newer.
2. Copy `.env.example` to `.env` in the project root and configure the required services below.
3. Run `npm run dev` and open `http://localhost:8000`.

The project has no frontend build step. Opening `index.html` directly does not provide the server APIs required for authentication and AI features.

## Features

- Supabase email/password sign-up, sign-in, password reset, profile storage and learner-state sync.
- Learner-created subjects, study materials, flashcards and summaries.
- Spaced-repetition flashcard reviews, activity insights and account settings.
- AI Tutor, voice and file-analysis APIs served by the included Node.js server.
- Responsive layout, light/dark/system themes and a first-run experience without prefilled learner content.

Practice, exam simulation, community and readiness pages are currently unavailable and are not shown in the workspace navigation.

## Supabase and AI setup

The OpenAI API key is read only by the server. Never add it to browser JavaScript or commit it to source control.

1. Set `OPENAI_API_KEY` in `.env`.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. `SUPABASE_ANON_KEY` is also accepted for older projects. Do not use a Supabase secret/service-role key in the browser config.
3. In Supabase, enable email/password sign-up with email confirmations. Add `http://localhost:8000/**` to the Auth redirect URL allowlist for local development; set the production Site URL and add its exact redirect URL before deploying.
4. Apply `supabase/migrations/0001_profiles_and_learning_state.sql`, then `supabase/migrations/0002_usernames.sql` in the Supabase SQL Editor.
5. Run `npm run dev`.

New sign-ups create a Supabase account. Supabase sends its configured confirmation link to the learner's email; after confirmation, the learner can sign in. The application does not provide a demo or arbitrary-credential sign-in path.

Signed-in learner state is synced to `public.user_app_state`; profile and onboarding data are stored in `public.profiles`. Browser local storage is used as the offline cache. Existing local learner state is not cleared by the launch cleanup.

The AI Tutor and related server endpoints require a valid Supabase access token and a working OpenAI configuration. The OpenAI key must remain server-side. The app loads `supabase-js` v2 from jsDelivr only when Supabase is configured.

Optional model overrides: `OPENAI_TUTOR_MODEL` (default `gpt-4.1-mini`), `OPENAI_TRANSCRIBE_MODEL` (default `gpt-4o-mini-transcribe`) and `OPENAI_TTS_MODEL` (default `gpt-4o-mini-tts`). Uploads are limited to 12 MB. DOCX extraction reads the main document body; complex layout, headers, footers and embedded images may not be preserved.

## Project structure

- `index.html`, `marketing.css`, `auth.css` — landing page, authentication views and shared styling.
- `app/` — signed-in workspace, local learner state, UI pages, Supabase client and cloud sync.
- `auth/` — sign-up wizard, form components and option data.
- `marketing/` — landing-page navigation and motion components.
- `server.js` — static server and authenticated API routes for AI-related features.
- `supabase/migrations/` — profile, learner-state and username tables with row-level security policies.
- `assets/` — local brand assets and favicon.

Run `npm run check` for the project's server and entry-point JavaScript syntax checks.
