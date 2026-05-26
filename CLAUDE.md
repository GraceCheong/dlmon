# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Keep `PROJECT_SUMMARY.md` as a current-state summary, not a chronological changelog. After meaningful work, update only essential feature outcomes: add new current facts, modify changed behavior, delete stale facts, and record useful verification/open risks. Do not append dated commit-style logs or file-by-file timelines.

---

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (must pass before committing)
npm run lint         # ESLint check
npx prisma db push   # Apply schema changes to SQLite dev.db (no migration file)
npx prisma studio    # Browse the database in a browser UI
node scratch/seed_test_data.js   # Seed a test teacher + sample courses
```

There are no automated tests. Verify changes by running `npm run build` (TypeScript + route compilation) and manually checking affected pages via the dev server.

**Test credentials:** seeded `test@example.com` / `password`. Any-password test-user bypass requires `ALLOW_DEV_ANY_PASSWORD_FOR_TEST_USER=true` in development.

---

## Architecture

### Stack

- **Next.js 16** (App Router, Server Components, Route Handlers)
- **SQLite + Prisma 6** (`engineType = "library"` — required by `next.config.ts` `serverExternalPackages`)
- **NextAuth v4** (Credentials provider only; no OAuth in MVP)
- **Vercel AI SDK v6** + local Ollama/OpenAI-compatible endpoint (`defaultModel` is currently `deepseek-r1:8b` in `lib/ai/client.ts`, overridable with `LOCAL_LLM_MODEL`)
- **Tailwind CSS 4** + vanilla CSS modules

### Auth pattern

Every API route handler must call `requireUserOrUnauthorized()` from `lib/auth-helpers.ts` and own-filter all DB queries by the returned `userId`. Server-component pages use `requireUserOrRedirect()` instead.

`getCurrentUserId()` uses the session first. In local development only, explicit `TEST_USER_ID` can stand in for script-driven QA. Do not add implicit test-user, first-user, or unauthenticated fallbacks.

### AI client

All AI generation routes import `aiClient` and `defaultModel` from `lib/ai/client.ts`. The client is an OpenAI-compatible instance pointed at Ollama (`LOCAL_LLM_URL`, default `http://localhost:11434/v1`). To change model or provider, edit that file or set `LOCAL_LLM_MODEL` / `LOCAL_LLM_URL` in `.env`.

Whisper STT for the import pipeline uses a separate model (`OLLAMA_STT_MODEL`) and calls `/v1/audio/transcriptions` multipart — not the standard chat endpoint.

### Lesson editor

State lives entirely in `context/EditorContext.tsx` (blocks array, add/update/remove/move, preview mode). `EditorCanvas.tsx` renders and reorders blocks via @dnd-kit. `BlockRegistry.tsx` maps block type strings to components.

Active block types: `heading`, `text`, `image`, `video`, `quiz`, `youtube-link`, `file-attachment`, `text-analyzer`, and `youtube-extract`.

`media-import` remains as a backwards-compatible alias for old saved lesson blocks. Keep it until old rows are migrated.

Lesson saves go to `PATCH /api/lessons/[lessonId]/blocks` (current). The old `POST /api/lessons/[lessonId]/save` is deprecated.

### YouTube media import pipeline

Async job queue across 9 modules in `lib/import-media/`. Entry point: `job-processor.ts`. Strategy: captions first, audio download + Whisper STT as fallback. All 12 status stages are defined in `lib/import-media/types.ts`.

**Security rule:** `MediaImportJob.audioStoragePath` is an internal field. It must never appear in any API response — filter it at the route layer.

### Writing evaluation

Rubrics (`WritingRubric`) are generated once during assignment setup and reused. Each evaluation creates a new `WritingEvaluation` row (append-only). Re-evaluation links back via `previousEvaluationId`. `rubricSnapshot` captures the rubric state at eval time.

Legacy `Submission.aiScore` / `Submission.aiFeedback` fields exist for backwards compat — new code reads scores from `WritingEvaluation`.

### JSON-in-SQLite fields

Several schema fields (`CurriculumPlan.data`, `LessonBlock.content`, `WritingRubric.criteria`, `MediaImportJob.aiResult`, etc.) are stored as TEXT in SQLite. Always `JSON.stringify` on write and `JSON.parse` on read — Prisma does not auto-coerce these.

### i18n

UI language (Korean/English) is managed by `context/LanguageContext.tsx`. All UI strings must come from `lib/translations.ts` via `useLanguage()`. Do not hardcode Korean or English strings in components.

Some older feature UIs still contain Korean literals. New or edited UI should route strings through `useLanguage()` and `lib/translations.ts`.

---

# Project Instructions

Before making code changes, read `docs/codebase-map.md` first.

Use the codebase map to identify the smallest relevant file set.
Do not scan the whole repository unless the map is missing or insufficient.

Prefer targeted edits over broad refactors.
Do not modify unrelated modules.
Do not delete, rename, or restructure files unless explicitly requested.

When new important files, legacy routes, or risky areas are discovered, update `docs/codebase-map.md`.

## Product Rules

- Students are teacher-managed records, not login users.
- Uploaded PDF/HWP/HWPX files are viewer resources only, not AI input.
- HWP/HWPX files should be converted to PDF server-side.
- Writing rubrics are generated during course/lesson/writing-assignment setup.
- Writing evaluation uses stored rubrics and saves rubric snapshots.
- YouTube PDF materials render thumbnail, title, and original link.
- Marketplace is free sharing only. Do not add monetization logic.
