# dlmon Codebase Map

> Token-saving implementation map. Last updated: 2026-05-26.

## Snapshot

- Stack: Next.js 16.2.3 App Router, React 19, Prisma SQLite, NextAuth Credentials, Vercel AI SDK with OpenAI-compatible local LLM.
- Before changing Next-specific code, read the relevant local guide under `node_modules/next/dist/docs/`.
- Useful checks: `npx prisma validate`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Current validation checked on 2026-05-26: `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass after the UI scenario implementation pass.

## Non-Negotiable Rules

- Use `requireUserOrRedirect()` in server pages and `requireUserOrUnauthorized()` in authenticated API routes. Then enforce ownership in DB queries.
- Intentional unauthenticated API exceptions: NextAuth, `/api/ai/ollama-status`, `/api/youtube/metadata`, legacy `/api/ai/grade`.
- Students are `Member` records, not login users. Student portal is link-based and requires `?memberId=...`.
- Save lesson editor content through `PATCH /api/lessons/[lessonId]/blocks`; `POST /api/lessons/[lessonId]/save` is legacy.
- Uploaded PDF/HWP/HWPX files are viewer resources only. Do not feed file contents into AI.
- Never return `MediaImportJob.audioStoragePath`, `UploadedFile.storagePath`, or `UploadedFile.convertedPath`.
- Writing evaluations are append-only. Re-evaluation creates a new `WritingEvaluation` linked by `previousEvaluationId`.
- Marketplace is free sharing only. No payments, pricing, purchase, subscription, or settlement logic.
- Textbook template feature is a shell until the textbook data model is decided.
- JSON-in-SQLite fields are stored as `String`/TEXT. Parse and stringify explicitly.

## Directory Map

| Path | Use |
|---|---|
| `app/` | App Router pages, layouts, route handlers |
| `components/` | React UI, split by dashboard/editor/public/shared |
| `lib/` | Auth helpers, AI client, import pipeline, file upload, utilities |
| `context/` | Editor and language providers |
| `prisma/schema.prisma` | Data model source of truth |
| `docs/` | Project summary, UI scenarios, this map |
| `scratch/` | Ad-hoc scripts only; do not import |
| `docker-compose.yml` | Legacy Postgres reference; current dev DB is SQLite |
| `i18n/` | Empty placeholder |

## Task-To-Files Map

| Task | Start Here | Notes |
|---|---|---|
| Auth/session | `lib/auth.ts`, `lib/auth-helpers.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx` | Passwords use scrypt; legacy plaintext upgrades on login. Dev bypass is explicit via `TEST_USER_ID` or `ALLOW_DEV_ANY_PASSWORD_FOR_TEST_USER=true` for `test@example.com`. |
| Dashboard/course list | `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/courses/page.tsx`, `components/dashboard/DashboardClient.tsx`, `components/dashboard/MyCoursesClient.tsx` | Server pages scope by `userId`. |
| Course plan hub | `app/(dashboard)/courses/[id]/plan/page.tsx`, `components/dashboard/PlanClient.tsx`, `components/dashboard/CurriculumEditor.tsx` | Primary hub for curriculum JSON, lesson access, file panel, assignment create/edit. |
| Curriculum/syllabus | `app/api/curriculum/[courseId]/route.ts`, `app/api/syllabus/[courseId]/route.ts`, `components/dashboard/SyllabusActions.tsx` | `CurriculumPlan.data` is JSON string; `Syllabus.content` is markdown string. |
| Lesson editor | `app/(dashboard)/editor/[lessonId]/page.tsx`, `context/EditorContext.tsx`, `components/editor/EditorCanvas.tsx`, `components/editor/BlockRegistry.tsx`, `components/editor/EditorToolbar.tsx` | Active blocks: `heading`, `text`, `image`, `video`, `quiz`, `youtube-link`, `file-attachment`, `text-analyzer`, `youtube-extract`. Alias: `media-import`. |
| Public lesson | `app/p/[slug]/page.tsx`, `components/public/PublicBlockList.tsx` | Uses same block registry. Passes `publicMode` so file blocks use public-safe file routes. |
| File upload/HWP conversion | `lib/file-upload.ts`, `lib/public-file-access.ts`, `lib/public-assignment-file-access.ts`, `app/api/files/*`, `app/api/public/files/*`, `app/api/public/assignments/*`, `components/dashboard/FilesClient.tsx`, `components/editor/blocks/FileAttachmentBlock.tsx` | Max 100 MB. Status: `not_needed`, `pending`, `processing`, `done`, `failed`. HWP/HWPX conversion requires LibreOffice `soffice`. `PATCH /api/files/[fileId]` updates `originalName` and `description` only — no disk rename, no path exposure. `/files` has search/filter/inline edit. Editor picker has search. Student assignment file routes require matching `assignmentId`, attached `fileId`, and teacher-owned `memberId`. |
| Assignment CRUD/attachments | `app/api/assignments/route.ts`, `app/api/assignments/[id]/route.ts`, `components/dashboard/CurriculumEditor.tsx`, `app/(dashboard)/assignments/new/*`, `app/(dashboard)/assignments/[id]/page.tsx`, `components/dashboard/StudentShareLinksClient.tsx` | Attachments are `AssignmentAttachment` rows linking assignments to teacher-owned `UploadedFile`s. Course-plan modal and standalone `/assignments/new` can select/upload attachments. Teacher detail shows per-member student links. |
| Members | `app/(dashboard)/members/page.tsx`, `components/dashboard/MembersClient.tsx`, `app/api/members/route.ts`, `app/api/members/[id]/route.ts` | `Member.email` optional. `deletedAt` soft-delete. Delete blocks when active submissions exist. |
| Student portal | `app/student/assignments/[id]/page.tsx`, `app/student/assignments/[id]/StudentAssignmentClient.tsx`, `app/api/ai/grade/route.ts`, `app/api/public/assignments/[assignmentId]/files/[fileId]/*` | Requires `memberId` query. Uses legacy one-shot grading but validates member/assignment same owner, blocks duplicate submissions with 409, and renders assignment attachments through member-bound public routes. |
| Writing rubric/evaluation | `lib/writing-evaluation.ts`, `app/api/ai/writing-rubrics/generate/route.ts`, `app/api/ai/writing-evaluations/evaluate/route.ts`, `app/api/writing-evaluations/[evaluationId]/*`, `components/dashboard/AssignmentDetailClient.tsx` | Assignment detail supports rubric display, AI replace, manual edit, detailed feedback, teacher comment, append-only re-evaluation. |
| AI client/model | `lib/ai/client.ts`, `lib/ai/generator.ts` | Default endpoint `LOCAL_LLM_URL || http://localhost:11434/v1`; model `LOCAL_LLM_MODEL || deepseek-r1:8b`; writing timeout `WRITING_AI_TIMEOUT_MS` default 120 s, max 300 s; rubric timeout default 30 s. |
| YouTube link block/PDF | `components/editor/blocks/YouTubeLinkBlock.tsx`, `app/api/youtube/metadata/route.ts`, `components/editor/EditorToolbar.tsx` | Browser uses iframe. PDF export hides iframe and shows `data-yt-pdf-fallback`. |
| YouTube AI import | `lib/youtube-url.ts`, `lib/import-media/types.ts`, `lib/import-media/job-processor.ts`, `app/api/ai/import-media/route.ts`, `app/api/ai/import-media/jobs/[jobId]/route.ts`, `components/editor/blocks/MediaImportBlock.tsx` | Editor block is primary MVP path; `/materials/import/youtube` is secondary. Caption-first, audio/STT fallback, output option controls, nested vocabulary/grammar/question editing. Save route accepts `lesson_material` only until another UI target is wired. |
| Chinese text/generator | `components/editor/blocks/TextAnalyzerBlock.tsx`, `app/api/ai/analyze-text/route.ts`, `lib/chinese-generator.ts`, `app/api/ai/chinese-generator/*`, `components/dashboard/ChineseGeneratorClient.tsx` | Editor inserts generated text blocks, uses shared `AudienceSelector`, saves to `GeneratedItem`, and loads history via collapsible panel. Standalone generator also save/reloads history. |
| Standalone lesson plans/prompts | `app/(dashboard)/lesson-plans/page.tsx`, `components/dashboard/LessonPlanGeneratorClient.tsx`, `app/api/ai/lesson-plans/generate/route.ts`, `app/api/lesson-plans/*`, `app/api/prompts/*` | Generate/save/search/select/edit/delete for plans and prompts. Prompts can be duplicated. Saved plan editing uses structured objectives/sections/materials/assessment/homework fields. |
| Templates/marketplace | `components/dashboard/TemplatesClient.tsx`, `components/dashboard/MarketplaceClient.tsx`, `app/api/templates/*`, `app/api/marketplace/templates/*` | Private templates can create/search/filter/edit/publish/unpublish/delete with structured section/activity/resource editing. Publish creates immutable `MarketplaceTemplate.snapshot`; marketplace filters by q/audience/HSK/type. |
| Textbook shell | `components/dashboard/TextbookTemplateClient.tsx`, `app/api/textbooks/*`, `app/api/ai/textbook-template/generate/route.ts` | Mock textbooks all unavailable; generate returns 503. |
| Shared audience selector | `components/shared/AudienceSelector.tsx` | Six values: `middle_school`, `high_school`, `university`, `adult`, `travel`, `business`. |
| i18n/layout | `context/LanguageContext.tsx`, `lib/translations.ts`, `app/(dashboard)/layout.tsx` | Some dashboard pages still hardcode Korean. |
| Prisma/schema | `prisma/schema.prisma`, `lib/prisma.ts`, `prisma/migrations/` | Schema has Phase 3 models, but migrations lag behind because latest schema was applied via `prisma db push`. |

## Page Routes

| Group | Routes |
|---|---|
| Public/auth | `/`, `/login`, `/p/[slug]`, `/student/assignments/[id]` |
| Dashboard core | `/dashboard`, `/courses`, `/courses/new`, `/courses/[id]/plan`, `/courses/[id]/syllabus`, `/members`, `/assignments`, `/assignments/new`, `/assignments/[id]`, `/syllabi`, `/settings` |
| Authoring/tools | `/editor/[lessonId]`, `/files`, `/lesson-plans`, `/templates`, `/marketplace`, `/textbook-templates`, `/tools/chinese-generator`, `/materials/import/youtube` |

## API Route Groups

| Prefix | Routes / Purpose |
|---|---|
| `/api/auth/[...nextauth]` | NextAuth handler |
| `/api/courses/*` | `generate`, `from-template`, `[id]/delete` |
| `/api/curriculum/[courseId]`, `/api/syllabus/[courseId]` | Patch plan JSON / syllabus markdown |
| `/api/lessons/*` | `create`, `[lessonId]/blocks`, `[lessonId]/publish`, legacy `[lessonId]/save` |
| `/api/assignments`, `/api/assignments/[id]` | Create/update assignments and attachments |
| `/api/members`, `/api/members/[id]` | List/create/update/soft-delete members |
| `/api/settings` | Get/patch user settings |
| `/api/files/*` | Upload/list/metadata/delete/preview/download/conversion retry |
| `/api/public/files/*` | Unauthenticated preview/download only for files referenced by published lesson file blocks |
| `/api/public/assignments/*` | Unauthenticated assignment attachment preview/download requiring `assignmentId`, attached `fileId`, and valid teacher-owned `memberId` |
| `/api/ai/*` | Analyze text, lesson content, lesson plans, Chinese generator, import media, writing eval/rubrics, textbook 503, Ollama status, legacy grade |
| `/api/writing-*` | Rubric get/archive, submission create, evaluation get/comment/reevaluate |
| `/api/youtube/metadata` | YouTube oEmbed metadata, unauthenticated |
| `/api/prompts/*`, `/api/lesson-plans/*` | Prompt and standalone lesson-plan CRUD |
| `/api/templates/*`, `/api/marketplace/templates/*` | Private templates, publish/unpublish, marketplace browse/copy |
| `/api/textbooks/*` | Placeholder textbook list/unit APIs |

## Data Model Groups

| Group | Models | Critical Notes |
|---|---|---|
| Auth | `User`, `Account`, `Session`, `VerificationToken` | `User` owns courses, members, AI content, files, templates. |
| Course/editor | `Course`, `CurriculumPlan`, `Syllabus`, `Lesson`, `LessonBlock` | `LessonBlock.content` is JSON string. `Lesson.slug` is public route key. |
| Students/assignments | `Member`, `Assignment`, `AssignmentAttachment`, `Submission` | `Submission.aiScore`/`aiFeedback` are legacy; use `WritingEvaluation` for new scores. |
| Writing eval | `WritingRubric`, `WritingEvaluation` | `criteria`, `deductionPolicy`, `rubricSnapshot`, feedback fields are JSON strings. |
| YouTube import | `MediaImportJob`, `MediaTranscriptChunk`, `ImportedMediaContent` | `audioStoragePath` internal only. |
| Files | `UploadedFile` | `storagePath` and `convertedPath` internal only. |
| AI tools | `Prompt`, `LessonPlan`, `GeneratedItem` | Standalone lesson plans are separate from course `CurriculumPlan`. |
| Templates | `Template`, `MarketplaceTemplate` | Marketplace stores immutable publish-time snapshot. |

## Known Gaps / Risk Areas

- `prisma/migrations/` lacks migrations for latest Phase 3 models. Fresh DB setup needs a migration or `prisma db push`.
- Editor and standalone Chinese generator flows both support save/history through `GeneratedItem`.
- File library supports search/filter/rename; keep disk paths internal when editing file APIs.
- Textbook templates are intentionally disabled until DB/source design is decided.
- Cross-feature i18n remains targeted work; newer touched components still contain Korean literals.

## Deprecated / Avoid

| Area | Why |
|---|---|
| `app/api/lessons/[lessonId]/save/route.ts` | Legacy save endpoint. Use blocks route. |
| `app/api/ai/grade/route.ts` | Legacy student portal grading. Do not extend for teacher flow. |
| `Submission.aiScore` / `Submission.aiFeedback` | Legacy display fields. |
| `docker-compose.yml` | Legacy Postgres setup, current app uses SQLite. |
| `scratch/` | Script-only workspace (seed scripts only). |
