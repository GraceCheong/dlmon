# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

When you finish any work under the "I:\dev\dlmon", write and update the "Project Summary.md" file to log the work you did. Write the log like a GitHub commit message with its date and time.

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

**Test credentials:** `test@example.com` / `password`

---

## Architecture

### Stack

- **Next.js 16** (App Router, Server Components, Route Handlers)
- **SQLite + Prisma 6** (`engineType = "library"` — required by `next.config.ts` `serverExternalPackages`)
- **NextAuth v4** (Credentials provider only; no OAuth in MVP)
- **Vercel AI SDK v6** + local Ollama (`qwen3:30b` default) via OpenAI-compatible endpoint
- **Tailwind CSS 4** + vanilla CSS modules

### Auth pattern

Every API route handler must call `requireUserOrUnauthorized()` from `lib/auth-helpers.ts` and own-filter all DB queries by the returned `userId`. Server-component pages use `requireUserOrRedirect()` instead.

`getCurrentUserId()` has a dev-only fallback: if no session exists, it returns the `test@example.com` user so the seeded dev environment works without logging in.

### AI client

All AI generation routes import `aiClient` and `defaultModel` from `lib/ai/client.ts`. The client is an OpenAI-compatible instance pointed at Ollama (`LOCAL_LLM_URL`, default `http://localhost:11434/v1`). To change model or provider, edit that file or set `LOCAL_LLM_MODEL` / `LOCAL_LLM_URL` in `.env`.

Whisper STT for the import pipeline uses a separate model (`OLLAMA_STT_MODEL`) and calls `/v1/audio/transcriptions` multipart — not the standard chat endpoint.

### Lesson editor

State lives entirely in `context/EditorContext.tsx` (blocks array, add/update/remove/move, preview mode). `EditorCanvas.tsx` renders and reorders blocks via @dnd-kit. `BlockRegistry.tsx` maps block type strings to components.

Active block types: `heading`, `text`, `image`, `video`, `quiz`, `youtube_link`, `text_analyzer`, `media_import`.

Four removed block files (`TonePracticeBlock`, `CharacterAnalysisBlock`, `SubtitleAnalysisBlock`, `CultureComparisonBlock`) still exist on disk — do not re-register them in BlockRegistry.

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

Known gap: `MembersClient.tsx`, `AssignmentFormClient.tsx`, `ImportYouTubeClient.tsx`, and the assignments detail page have not yet been wired to `useLanguage`.

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
