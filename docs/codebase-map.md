# dlmon Codebase Map

> Token-saving navigation guide for future Claude sessions.
> Last updated: 2026-05-06

---

## 1. Top-Level Structure

| Path | Purpose | Read Priority |
|---|---|---|
| `app/` | Next.js App Router — pages, layouts, API routes | High |
| `components/` | All React UI components | High |
| `lib/` | Business logic, AI clients, import pipeline, utilities | High |
| `prisma/` | SQLite schema, migrations, dev.db | High |
| `context/` | React Context providers (editor state, language) | Medium |
| `scratch/` | One-off DB repair and seed scripts — not production code | Low |
| `public/` | Static assets (SVG icons, hero image) | Low |
| `next.config.ts` | Next.js config — external packages, allowed origins | Low |
| `package.json` | Dependency list and script definitions | Low |
| `.env` | Runtime secrets and local service URLs (never commit) | Low |
| `docker-compose.yml` | Legacy PostgreSQL setup — superseded by SQLite | Avoid |
| `i18n/` | Empty placeholder directory — no code here | Avoid |

---

## 2. Feature Map

### Auth / Ownership

Purpose:
- Email+password login via NextAuth Credentials provider. Teachers own all records they create (courses, members, rubrics, import jobs).

Read first:
- `lib/auth.ts` — NextAuth config, CredentialsProvider, bcrypt verification
- `lib/auth-helpers.ts` — `getServerSessionOrThrow()` used by every API route to enforce ownership

Read if needed:
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler (thin wrapper)
- `app/login/page.tsx` — Login UI
- `prisma/schema.prisma` lines 11–78 — `User`, `Account`, `Session`, `VerificationToken` models

Notes:
- There is no registration UI in MVP; users are created via seed scripts.
- Students (`Member`) are NOT login users — they are teacher-managed records only.
- Every API route must call `getServerSessionOrThrow()` before any DB write.

---

### Course / Lesson Management

Purpose:
- Teachers create courses (with AI assist), generate a 15-week curriculum plan, attach lessons, and publish them via public slug links.

Read first:
- `prisma/schema.prisma` lines 81–135 — `Course`, `CurriculumPlan`, `Syllabus`, `Lesson`, `LessonBlock`
- `app/api/curriculum/[courseId]/route.ts` — curriculum plan CRUD
- `app/api/lessons/[lessonId]/blocks/route.ts` — atomic lesson block save (current endpoint)

Read if needed:
- `app/(dashboard)/courses/page.tsx` — course list page
- `app/(dashboard)/courses/new/page.tsx` — new course form page
- `app/(dashboard)/courses/[id]/plan/page.tsx` — curriculum plan view
- `app/api/courses/generate/route.ts` — AI-generate course from template
- `app/api/lessons/[lessonId]/save/route.ts` — legacy save endpoint (superseded by blocks route)
- `components/dashboard/CourseForm.tsx` — course creation/edit form
- `components/dashboard/CurriculumEditor.tsx` — 15-week plan UI editor
- `lib/templates/courseTemplates.ts` — hardcoded course template definitions

Notes:
- `app/api/lessons/[lessonId]/save/route.ts` is **legacy**; prefer `blocks/route.ts` for lesson content.
- `CurriculumPlan.data` and `Syllabus.content` are stored as raw JSON/markdown strings in SQLite.

---

### Lesson Material Editor

Purpose:
- Block-based drag-and-drop lesson editor. Teachers compose lessons from typed content blocks.

Read first:
- `context/EditorContext.tsx` — all editor state: blocks array, add/update/remove/move operations, preview mode
- `components/editor/EditorCanvas.tsx` — renders block list, handles DnD reorder
- `components/editor/BlockRegistry.tsx` — maps block type strings to React components
- `components/editor/EditorToolbar.tsx` — save/preview/publish controls

Read if needed:
- `app/(dashboard)/editor/[lessonId]/page.tsx` — editor page (server wrapper)
- `components/editor/SortableBlockWrapper.tsx` — @dnd-kit drag-drop wrapper
- `components/editor/blocks/HeadingBlock.tsx` — heading block
- `components/editor/blocks/TextBlock.tsx` — rich text block
- `components/editor/blocks/QuizBlock.tsx` — multiple-choice quiz block
- `components/editor/blocks/ImageBlock.tsx` — image upload block
- `components/editor/blocks/VideoBlock.tsx` — generic video embed block
- `components/editor/blocks/TextAnalyzerBlock.tsx` — HSK text analyzer

Notes:
- Active block types: `heading`, `text`, `image`, `video`, `quiz`, `youtube_link`, `text_analyzer`, `media_import`.
- Four block files exist for removed types (`TonePracticeBlock`, `CharacterAnalysisBlock`, `SubtitleAnalysisBlock`, `CultureComparisonBlock`) — kept for back-compat but not registered in BlockRegistry.

---

### YouTube Link Material

Purpose:
- Embeds a YouTube video preview (thumbnail + title + link) inside a lesson block. Renders as a card, not an iframe player. PDF export shows thumbnail + title + original URL.

Read first:
- `components/editor/blocks/YouTubeLinkBlock.tsx` — the block UI (thumbnail card)
- `app/api/youtube/metadata/route.ts` — fetches title + thumbnail via oEmbed

Read if needed:
- `components/editor/BlockRegistry.tsx` — check that `youtube_link` is registered
- `components/public/PublicBlockList.tsx` — how it renders in public/student view

Notes:
- YouTube link block is display-only; it is NOT the AI import feature.
- PDF export must render thumbnail image + title + URL (not an iframe).
- Do not add iframe embed — the design decision is thumbnail-card only.

---

### YouTube Media / Audio Import

Purpose:
- Async pipeline: teacher submits YouTube URL → system fetches captions (or downloads audio + Whisper STT) → AI generates vocabulary lists, grammar notes, activities → teacher edits and saves to a lesson.

Read first:
- `lib/import-media/types.ts` — all TypeScript types, `JOB_STATUS_LABELS`, status stages
- `lib/import-media/job-processor.ts` — orchestrator: caption-first strategy, audio fallback
- `app/api/ai/import-media/route.ts` — start job (POST)
- `app/api/ai/import-media/jobs/[jobId]/route.ts` — poll job status (GET)

Read if needed:
- `lib/import-media/constants.ts` — env-driven configuration values
- `lib/import-media/youtube-metadata.ts` — yt-dlp + oEmbed metadata fetch
- `lib/import-media/youtube-transcript.ts` — SRT/VTT parser, Chinese caption priority
- `lib/import-media/audio-download.ts` — yt-dlp audio download to WAV
- `lib/import-media/audio-processing.ts` — ffmpeg normalize to 16 kHz mono + chunk
- `lib/import-media/speech-to-text.ts` — Ollama Whisper transcription (base64 multipart)
- `lib/import-media/ai-content.ts` — qwen3:30b content generation + JSON repair
- `lib/import-media/audio-cleanup.ts` — async temp file deletion
- `app/api/ai/import-media/jobs/[jobId]/save/route.ts` — save completed job result to lesson
- `components/dashboard/ImportYouTubeClient.tsx` — 3-step UI (form → progress → result)
- `app/(dashboard)/materials/import/youtube/page.tsx` — import page
- `prisma/schema.prisma` lines 177–251 — `MediaImportJob`, `MediaTranscriptChunk`, `ImportedMediaContent`

Notes:
- `audioStoragePath` in `MediaImportJob` is an internal field — **NEVER return it from any API route**.
- Audio files are temp files and are deleted after transcription.
- The 12-stage status flow is defined in `lib/import-media/types.ts` `JOB_STATUS_LABELS`.

---

### File Upload / PDF / HWP / HWPX Handling

Status: Not found in current codebase

Notes:
- HWP/HWPX conversion to PDF and PDF viewer are listed in MVP spec but not yet implemented.
- When implementing: conversion must be server-side; uploaded files are viewer resources only, not AI input.

---

### PDF Rendering / Export

Status: Not found in current codebase (html2pdf.js is in package.json but no render route exists)

Notes:
- `html2pdf.js` is listed as a dependency, suggesting client-side PDF generation is planned.
- YouTube link PDF export rule: render thumbnail image + title + original URL (no iframe).

---

### AI Provider / Model Integration

Purpose:
- Single OpenAI-compatible client pointed at a local Ollama instance. All AI features (curriculum, rubrics, evaluation, import) route through this client.

Read first:
- `lib/ai/client.ts` — OpenAI-compatible client config, Ollama endpoint, default model
- `lib/ai/generator.ts` — reusable generation helpers

Read if needed:
- `app/api/ai/generate-lesson-content/route.ts` — lesson content generation endpoint
- `app/api/ai/ollama-status/route.ts` — health check for Ollama

Notes:
- Default AI provider is local Ollama at `http://localhost:11434`.
- Default model is `qwen3:30b` for content generation.
- Whisper STT model is `karanchopda333/whisper:latest` (separate Ollama model).
- `User.aiMode` is a teacher toggle for advanced AI features.
- To swap provider or model: change `lib/ai/client.ts` and relevant `.env` variables.

---

### Lesson Plan Generation

Purpose:
- AI generates a 15-week curriculum plan from a course template.

Read first:
- `app/api/courses/generate/route.ts` — AI course generation from template
- `app/api/curriculum/[courseId]/route.ts` — CRUD for stored curriculum plan
- `lib/templates/courseTemplates.ts` — available course templates

Read if needed:
- `components/dashboard/CurriculumEditor.tsx` — editor UI for the generated plan
- `lib/ai/generator.ts` — generation utilities

---

### Writing Rubric Setup

Purpose:
- AI-generated rubrics are created once during assignment/course setup (not during evaluation). A rubric defines grading criteria weights and deduction policy for a given HSK level and target audience.

Read first:
- `prisma/schema.prisma` lines 259–278 — `WritingRubric` model
- `app/api/ai/writing-rubrics/generate/route.ts` — AI rubric generation endpoint
- `app/api/writing-rubrics/[rubricId]/route.ts` — GET rubric
- `lib/writing-evaluation.ts` — rubric TypeScript types, score normalizers, AI prompts

Read if needed:
- `app/api/writing-rubrics/[rubricId]/archive/route.ts` — archive (soft-disable) a rubric
- `prisma/schema.prisma` lines 138–150 — `Assignment.rubricId` link

Notes:
- Rubrics are generated once and reused — do NOT regenerate per evaluation.
- `WritingRubric.criteria` and `deductionPolicy` are JSON strings in SQLite.

---

### Chinese Writing Evaluation

Purpose:
- Evaluates a student's writing submission against a stored rubric. Creates a new `WritingEvaluation` row each time (never overwrites). Teacher can add a comment after AI evaluation.

Read first:
- `prisma/schema.prisma` lines 289–311 — `WritingEvaluation` model
- `app/api/ai/writing-evaluations/evaluate/route.ts` — AI evaluation endpoint (POST)
- `app/api/writing-evaluations/[evaluationId]/route.ts` — GET evaluation
- `lib/writing-evaluation.ts` — score normalizers, AI prompt builders, TypeScript types

Read if needed:
- `app/api/writing-evaluations/[evaluationId]/reevaluate/route.ts` — re-evaluate (creates new row, links via `previousEvaluationId`)
- `app/api/writing-evaluations/[evaluationId]/comment/route.ts` — add teacher comment (PATCH)
- `app/api/ai/grade/route.ts` — legacy grade endpoint (deprecated, replaced by evaluate endpoint)
- `prisma/schema.prisma` lines 152–170 — `Submission` model (note legacy fields)

Notes:
- Re-evaluation creates a NEW `WritingEvaluation` row; `previousEvaluationId` links the chain.
- `rubricSnapshot` on each evaluation captures the rubric state at eval time (immutable history).
- `Submission.aiScore` and `Submission.aiFeedback` are legacy fields — read scores from `WritingEvaluation` instead.

---

### Student Management

Purpose:
- Teachers maintain a roster of students as `Member` records. Students are NOT login users in MVP.

Read first:
- `prisma/schema.prisma` lines 31–44 — `Member` model
- `app/api/members/route.ts` — list and create members
- `app/api/members/[id]/route.ts` — get, update, soft-delete member

Read if needed:
- `components/dashboard/MembersClient.tsx` — members table UI
- `app/(dashboard)/members/page.tsx` — members page

Notes:
- `Member.deletedAt` is a soft-delete field — all queries must filter `deletedAt: null`.
- `Member.email` is optional — members may not have an email address.
- `Member.metadata` is a flexible JSON blob stored as TEXT in SQLite — parse on the client.

---

### Template / Marketplace

Status: Not found in current codebase

Notes:
- `lib/templates/courseTemplates.ts` has hardcoded course template definitions.
- Marketplace (free sharing) is in MVP spec but no marketplace UI or API routes exist yet.
- Do NOT add monetization logic when implementing.

---

### Textbook Template UI Shell

Status: Not found in current codebase

Notes:
- Listed in MVP spec as "UI shell only until textbook DB is clarified."
- Do not implement backend logic for textbook templates until the data model is decided.

---

### Prisma / Database Schema

Purpose:
- Single source of truth for all data models. SQLite in dev; schema has 14 models.

Read first:
- `prisma/schema.prisma` — full schema (all models, relations, field comments)

Read if needed:
- `lib/prisma.ts` — Prisma client singleton (use `engineType: "library"` pattern)
- `prisma/migrations/` — migration history

Notes:
- `engineType = "library"` in schema.prisma is required for Next.js server components (see `next.config.ts` `serverExternalPackages`).
- JSON fields (`data`, `content`, `criteria`, `aiResult`, etc.) are stored as TEXT in SQLite — always serialize/deserialize explicitly.
- `docker-compose.yml` sets up PostgreSQL but the project currently uses SQLite (`DATABASE_URL=file:./dev.db`).

---

### Shared UI / Validation / Utilities

Purpose:
- Internationalization, shared UI primitives, and translation strings.

Read first:
- `lib/translations.ts` — all UI strings in Korean and English
- `context/LanguageContext.tsx` — language toggle state (ko/en, localStorage persistence)

Read if needed:
- `components/Providers.tsx` — wraps app with SessionProvider + LanguageProvider
- `components/dashboard/MarkdownRenderer.tsx` — shared markdown renderer

---

## 3. Route Map

### Frontend Routes

| Route | File | Purpose | Feature |
|---|---|---|---|
| `/` | `app/page.tsx` | Landing page | Marketing |
| `/login` | `app/login/page.tsx` | Teacher login | Auth |
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Dashboard home | Dashboard |
| `/courses` | `app/(dashboard)/courses/page.tsx` | Course list | Course mgmt |
| `/courses/new` | `app/(dashboard)/courses/new/page.tsx` | Create course | Course mgmt |
| `/courses/[id]/syllabus` | `app/(dashboard)/courses/[id]/syllabus/page.tsx` | Course syllabus | Course mgmt |
| `/courses/[id]/plan` | `app/(dashboard)/courses/[id]/plan/page.tsx` | Curriculum plan | Lesson plan |
| `/editor/[lessonId]` | `app/(dashboard)/editor/[lessonId]/page.tsx` | Lesson block editor | Editor |
| `/assignments` | `app/(dashboard)/assignments/page.tsx` | Assignment list | Assignments |
| `/assignments/new` | `app/(dashboard)/assignments/new/page.tsx` | Create assignment | Assignments |
| `/assignments/[id]` | `app/(dashboard)/assignments/[id]/page.tsx` | Edit assignment | Assignments |
| `/members` | `app/(dashboard)/members/page.tsx` | Student roster | Student mgmt |
| `/settings` | `app/(dashboard)/settings/page.tsx` | User settings | Auth |
| `/syllabi` | `app/(dashboard)/syllabi/page.tsx` | All syllabi | Course mgmt |
| `/materials/import/youtube` | `app/(dashboard)/materials/import/youtube/page.tsx` | YouTube import | Media import |
| `/student/assignments/[id]` | `app/student/assignments/[id]/page.tsx` | Student submission | Student portal |
| `/p/[slug]` | `app/p/[slug]/page.tsx` | Public lesson view | Public |

### API Routes

| Route | File | Purpose | Feature |
|---|---|---|---|
| `/api/auth/[...nextauth]` | `app/api/auth/[...nextauth]/route.ts` | NextAuth handler | Auth |
| `/api/courses/generate` | `app/api/courses/generate/route.ts` | AI course generation | Lesson plan |
| `/api/courses/from-template` | `app/api/courses/from-template/route.ts` | Course from template | Course mgmt |
| `/api/courses/[id]/delete` | `app/api/courses/[id]/delete/route.ts` | Delete course | Course mgmt |
| `/api/curriculum/[courseId]` | `app/api/curriculum/[courseId]/route.ts` | Curriculum CRUD | Lesson plan |
| `/api/syllabus/[courseId]` | `app/api/syllabus/[courseId]/route.ts` | Syllabus CRUD | Course mgmt |
| `/api/lessons/create` | `app/api/lessons/create/route.ts` | Create lesson | Course mgmt |
| `/api/lessons/[lessonId]/blocks` | `app/api/lessons/[lessonId]/blocks/route.ts` | Atomic block save **(current)** | Editor |
| `/api/lessons/[lessonId]/save` | `app/api/lessons/[lessonId]/save/route.ts` | Save lesson **(legacy)** | Editor |
| `/api/lessons/[lessonId]/publish` | `app/api/lessons/[lessonId]/publish/route.ts` | Publish lesson | Editor |
| `/api/assignments` | `app/api/assignments/route.ts` | List/create assignments | Assignments |
| `/api/members` | `app/api/members/route.ts` | List/create members | Student mgmt |
| `/api/members/[id]` | `app/api/members/[id]/route.ts` | Get/update/delete member | Student mgmt |
| `/api/settings` | `app/api/settings/route.ts` | User settings CRUD | Auth |
| `/api/writing-rubrics/[rubricId]` | `app/api/writing-rubrics/[rubricId]/route.ts` | Get rubric | Writing rubric |
| `/api/writing-rubrics/[rubricId]/archive` | `app/api/writing-rubrics/[rubricId]/archive/route.ts` | Archive rubric | Writing rubric |
| `/api/writing-submissions` | `app/api/writing-submissions/route.ts` | Create submission | Writing eval |
| `/api/writing-evaluations/[evaluationId]` | `app/api/writing-evaluations/[evaluationId]/route.ts` | Get evaluation | Writing eval |
| `/api/writing-evaluations/[evaluationId]/comment` | `app/api/writing-evaluations/[evaluationId]/comment/route.ts` | Add teacher comment | Writing eval |
| `/api/writing-evaluations/[evaluationId]/reevaluate` | `app/api/writing-evaluations/[evaluationId]/reevaluate/route.ts` | Re-evaluate (new row) | Writing eval |
| `/api/ai/analyze-text` | `app/api/ai/analyze-text/route.ts` | HSK text analysis | AI / Editor |
| `/api/ai/ollama-status` | `app/api/ai/ollama-status/route.ts` | Ollama health check | AI |
| `/api/ai/generate-lesson-content` | `app/api/ai/generate-lesson-content/route.ts` | AI lesson content gen | Lesson plan |
| `/api/ai/grade` | `app/api/ai/grade/route.ts` | Grade submission **(deprecated)** | Writing eval |
| `/api/ai/import-media` | `app/api/ai/import-media/route.ts` | Start YouTube import job | Media import |
| `/api/ai/import-media/jobs/[jobId]` | `app/api/ai/import-media/jobs/[jobId]/route.ts` | Poll job status | Media import |
| `/api/ai/import-media/jobs/[jobId]/save` | `app/api/ai/import-media/jobs/[jobId]/save/route.ts` | Save import result | Media import |
| `/api/ai/writing-rubrics/generate` | `app/api/ai/writing-rubrics/generate/route.ts` | Generate rubric with AI | Writing rubric |
| `/api/ai/writing-evaluations/evaluate` | `app/api/ai/writing-evaluations/evaluate/route.ts` | AI writing evaluation | Writing eval |
| `/api/youtube/metadata` | `app/api/youtube/metadata/route.ts` | YouTube oEmbed metadata | YouTube link |

---

## 4. Database Map

| Model/Table | Purpose | Related Feature | Notes |
|---|---|---|---|
| `User` | Teacher account | Auth | Owns all resources; `aiMode` toggles advanced AI |
| `Account` | OAuth account links | Auth | NextAuth internal |
| `Session` | Active sessions | Auth | NextAuth internal |
| `VerificationToken` | Email verification | Auth | NextAuth internal |
| `Course` | Top-level course container | Course mgmt | Owns lessons, syllabus, curriculum plan |
| `CurriculumPlan` | 15-week lesson plan | Lesson plan | `data` is JSON string; one per course |
| `Syllabus` | Course syllabus text | Course mgmt | `content` is markdown string; one per course |
| `Lesson` | Individual lesson | Editor | Has `slug` (public URL), `status` (draft/published) |
| `LessonBlock` | One content block in a lesson | Editor | `type` string + `content` JSON string |
| `Member` | Teacher-managed student record | Student mgmt | NOT a login user; `deletedAt` soft-delete |
| `Assignment` | Task linked to a lesson | Assignments | `type`: `speaking` or `writing`; links to rubric |
| `Submission` | Student's submitted work | Assignments / Writing eval | `aiScore`/`aiFeedback` are legacy — use `WritingEvaluation` |
| `WritingRubric` | Reusable grading rubric | Writing rubric | `criteria` and `deductionPolicy` are JSON strings |
| `WritingEvaluation` | One evaluation pass | Writing eval | Append-only; `previousEvaluationId` chains versions |
| `MediaImportJob` | YouTube import job tracker | Media import | `audioStoragePath` is internal — never expose via API |
| `MediaTranscriptChunk` | Chunked transcript segments | Media import | Linked to job; used for STT processing |
| `ImportedMediaContent` | Saved (edited) AI result | Media import | `content` is JSON string; one per job |

Suspicious / Missing:
- No `Material` model despite `materialId` field in `ImportedMediaContent` — the materials feature is planned but not yet modeled.
- No `Template` or `Marketplace` model despite these being in the MVP spec.
- `docker-compose.yml` references PostgreSQL but the project uses SQLite — can cause confusion.

---

## 5. Token-Saving Read Guide

### Fixing YouTube preview/player behavior

Read first:
1. `components/editor/blocks/YouTubeLinkBlock.tsx`
2. `app/api/youtube/metadata/route.ts`

Read only if needed:
1. `components/public/PublicBlockList.tsx` (for public view rendering)
2. `components/editor/BlockRegistry.tsx` (to verify block is registered)

Avoid unless debugging:
1. `lib/import-media/` (unrelated — that's the async AI pipeline)

---

### Fixing YouTube PDF export

Read first:
1. `components/editor/blocks/YouTubeLinkBlock.tsx` (thumbnail + title card markup)

Read only if needed:
1. `package.json` (confirm html2pdf.js version)

Avoid unless debugging:
1. `lib/import-media/` (unrelated)

---

### Fixing YouTube media/audio import

Read first:
1. `lib/import-media/types.ts` (all types and status stages)
2. `lib/import-media/job-processor.ts` (orchestration logic)
3. `app/api/ai/import-media/route.ts` (job creation)
4. `app/api/ai/import-media/jobs/[jobId]/route.ts` (status polling)

Read only if needed:
1. `lib/import-media/youtube-transcript.ts` (caption fetch/parse)
2. `lib/import-media/audio-download.ts` (yt-dlp download)
3. `lib/import-media/audio-processing.ts` (ffmpeg chunking)
4. `lib/import-media/speech-to-text.ts` (Whisper STT)
5. `lib/import-media/ai-content.ts` (AI content generation)
6. `components/dashboard/ImportYouTubeClient.tsx` (UI)

Avoid unless debugging:
1. `app/api/ai/grade/route.ts` (deprecated, different feature)

---

### Changing AI provider/model

Read first:
1. `lib/ai/client.ts`
2. `.env` (OLLAMA_URL, OLLAMA_STT_MODEL)

Read only if needed:
1. `lib/import-media/constants.ts` (import-specific model config)
2. `lib/import-media/speech-to-text.ts` (STT model reference)
3. `lib/import-media/ai-content.ts` (content gen model reference)

Avoid unless debugging:
1. All route files (they use the shared client)

---

### Changing lesson plan generation

Read first:
1. `app/api/courses/generate/route.ts`
2. `lib/ai/generator.ts`
3. `lib/templates/courseTemplates.ts`

Read only if needed:
1. `app/api/curriculum/[courseId]/route.ts`
2. `components/dashboard/CurriculumEditor.tsx`

---

### Changing writing rubric generation

Read first:
1. `app/api/ai/writing-rubrics/generate/route.ts`
2. `lib/writing-evaluation.ts` (prompt builders and types)
3. `prisma/schema.prisma` lines 259–278 (`WritingRubric`)

Read only if needed:
1. `app/api/writing-rubrics/[rubricId]/route.ts`

---

### Changing writing evaluation scoring

Read first:
1. `app/api/ai/writing-evaluations/evaluate/route.ts`
2. `lib/writing-evaluation.ts` (score normalizers, AI prompts)
3. `prisma/schema.prisma` lines 289–311 (`WritingEvaluation`)

Read only if needed:
1. `app/api/writing-evaluations/[evaluationId]/reevaluate/route.ts`
2. `app/api/writing-evaluations/[evaluationId]/comment/route.ts`

Avoid unless debugging:
1. `app/api/ai/grade/route.ts` (deprecated)

---

### Changing file upload or HWP conversion

Read first:
1. `prisma/schema.prisma` (no current Material model — start here to design it)

Read only if needed:
1. `package.json` (check for any existing file-handling libraries)

Note: This feature does not exist yet. Read the MVP spec (`dlmon_llm_implementation_prompt.md`) before implementing.

---

### Changing PDF rendering

Read first:
1. `package.json` (html2pdf.js is listed as a dependency)

Read only if needed:
1. `components/editor/blocks/YouTubeLinkBlock.tsx` (YouTube PDF export rule: thumbnail + title + URL)

Note: No PDF rendering implementation exists yet beyond the dependency declaration.

---

### Changing marketplace/templates

Read first:
1. `lib/templates/courseTemplates.ts` (only current template code)

Note: No marketplace UI or API exists. See MVP spec for planned design.

---

### Changing student records

Read first:
1. `prisma/schema.prisma` lines 31–44 (`Member`)
2. `app/api/members/route.ts`
3. `app/api/members/[id]/route.ts`

Read only if needed:
1. `components/dashboard/MembersClient.tsx`

---

### Changing Prisma/database schema

Read first:
1. `prisma/schema.prisma` (full file)
2. `lib/prisma.ts` (client singleton pattern)

Read only if needed:
1. `prisma/migrations/` (migration history)
2. `next.config.ts` (`serverExternalPackages` — required for Prisma library engine)

---

## 6. Deprecated / Risky Areas

| File or Directory | Risk | Recommendation |
|---|---|---|
| `app/api/lessons/[lessonId]/save/route.ts` | Legacy save endpoint, superseded by `blocks/route.ts` | Read only when debugging old saves; prefer blocks endpoint for new code |
| `app/api/ai/grade/route.ts` | Deprecated grading endpoint; replaced by writing-evaluations/evaluate | Do not extend; read only to understand migration path |
| `components/editor/blocks/TonePracticeBlock.tsx` | Removed block type kept for back-compat | Do not re-register in BlockRegistry |
| `components/editor/blocks/CharacterAnalysisBlock.tsx` | Removed block type | Do not re-register in BlockRegistry |
| `components/editor/blocks/SubtitleAnalysisBlock.tsx` | Removed block type (merged into MediaImportBlock) | Do not re-register in BlockRegistry |
| `components/editor/blocks/CultureComparisonBlock.tsx` | Removed block type | Do not re-register in BlockRegistry |
| `Submission.aiScore` / `Submission.aiFeedback` | Legacy fields; new scores live in `WritingEvaluation` | Read-only for backwards display; do not write to these fields in new code |
| `docker-compose.yml` | References PostgreSQL but project uses SQLite | Ignore unless migrating to Postgres |
| `scratch/` | Ad-hoc DB repair scripts, not production code | Read if debugging data integrity; never import from here |
| `i18n/` | Empty placeholder directory | Ignore |
| `MediaImportJob.audioStoragePath` | Internal path — must never be returned by any API route | Always filter this field at the route layer |

---

## Important Project Rules (Summary)

- **Students are not login users.** `Member` records are teacher-managed; they cannot sign in.
- **Uploaded PDF/HWP/HWPX files are viewer resources only** — not AI input.
- **HWP/HWPX → PDF conversion is server-side** when implemented.
- **Rubrics are generated once** during assignment setup, not per evaluation.
- **Evaluations are append-only.** Re-evaluation creates a new `WritingEvaluation` row linked via `previousEvaluationId`.
- **YouTube link PDF** renders thumbnail + title + original URL (not iframe, not player).
- **Marketplace is free sharing only** — no monetization logic.
- **Textbook template is UI shell only** until the textbook data model is decided.
- **`audioStoragePath` must never be exposed** in any API response.
- **JSON fields in SQLite** (`criteria`, `data`, `content`, `aiResult`, etc.) are stored as TEXT — always parse explicitly.
