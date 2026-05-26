# UI Scenarios

> Token-saving UI implementation matrix. Last updated: 2026-05-26.

## Roles / Scope

| Role | Scope |
|---|---|
| Teacher | Authenticated NextAuth user. Owns courses, lessons, members, files, prompts, plans, templates, rubrics, evaluations. |
| Student | No login. Teacher-managed `Member` record. Uses `/student/assignments/[id]?memberId=...`. |

Do not add student login/dashboard, marketplace monetization, AI ingestion of uploaded files, or textbook-source assumptions unless the product scope changes.

## Scenario Matrix

| ID | Scenario / Entry | Implemented | Missing / Constraints | Key Code |
|---|---|---|---|---|
| A | Lesson plan generation, `/lesson-plans` | Generate structured plan, save plan, live saved-plan list, empty state, search, structured edit/delete saved plans. | Files remain JSON-in-SQLite internally; UI no longer exposes raw JSON editing. | `components/dashboard/LessonPlanGeneratorClient.tsx`, `app/api/ai/lesson-plans/generate/route.ts`, `app/api/lesson-plans/*` |
| B | Prompt management inside `/lesson-plans` | Save prompt with title, select/edit/delete/duplicate existing prompts, search list, list refreshes immediately, save errors surface. | None in MVP scope. | `components/dashboard/LessonPlanGeneratorClient.tsx`, `app/api/prompts/*` |
| C | File library and attachments, `/files`, `/courses/[id]/plan`, `/assignments/new`, editor `file-attachment` | PDF/HWP/HWPX upload, status, preview, download, retry, delete; assignment linking in both assignment creation flows; editor file block; public lesson and student assignment attachment preview/download via public-safe routes. Search/filter by name/description/type/status; inline rename and description edit via `PATCH /api/files/[fileId]`; editor picker search. | Files are viewer resources only, not AI input. No batch rename. | `lib/file-upload.ts`, `lib/public-file-access.ts`, `lib/public-assignment-file-access.ts`, `components/editor/blocks/FileAttachmentBlock.tsx`, `app/api/files/*`, `app/api/public/files/*`, `app/api/public/assignments/*` |
| D | YouTube link block, editor `youtube-link` | Watch/Shorts/youtu.be metadata, playable iframe, manual title fallback, PDF fallback thumbnail/title/link. | No transcript, AI summary, QR code. This block is display-only, not the import pipeline. | `YouTubeLinkBlock.tsx`, `EditorToolbar.tsx`, `app/api/youtube/metadata/route.ts` |
| E | YouTube AI material extraction, editor `youtube-extract` | Start async import job, poll progress, captions-first/audio-STT fallback, output option controls, editable title/transcript/summary/teacher notes/vocabulary/grammar/questions, optional saved import record. Save target is intentionally `lesson_material` only until another UI path exists. | Standalone `/materials/import/youtube` is secondary. | `MediaImportBlock.tsx`, `lib/import-media/*`, `app/api/ai/import-media/*` |
| F | Chinese generator in HSK analysis + standalone `/tools/chinese-generator` | Editor analyzes Chinese text, uses shared audience selector, inserts generated items, saves to `GeneratedItem`, and loads history via history toggle. Standalone generator saves and reloads saved history. | None in MVP scope. | `TextAnalyzerBlock.tsx`, `ChineseGeneratorClient.tsx`, `lib/chinese-generator.ts`, `app/api/ai/chinese-generator/*` |
| G | Course management and assignments, `/courses/[id]/plan`, `/assignments/new` | Curriculum edit, saved lesson content access, file panel, create/edit course-linked assignments, attach files. The standalone new-assignment form can also select/upload attachments. | Course plan remains the primary flow for course context. | `CurriculumEditor.tsx`, `PlanClient.tsx`, `app/(dashboard)/assignments/new/*`, `app/api/assignments/*`, `app/api/lessons/create/route.ts` |
| H | Writing rubric setup, `/assignments/[id]` | AI generate/replace active assignment rubric, display criteria/policy, manual rubric edit with 100-point validation. | Historical evaluations keep old rubric snapshots by design. | `AssignmentDetailClient.tsx`, `app/api/ai/writing-rubrics/generate/route.ts`, `app/api/writing-rubrics/*` |
| I | Teacher writing evaluation, `/assignments/[id]` | Teacher enters writing, creates submission, evaluates against rubric, shows score/summary/deductions/sentence feedback, saves teacher comment, re-evaluates append-only. | Improved examples depend on AI response shape; no separate side-by-side rewrite editor. | `AssignmentDetailClient.tsx`, `app/api/writing-submissions/route.ts`, `app/api/ai/writing-evaluations/evaluate/route.ts`, `app/api/writing-evaluations/[evaluationId]/*` |
| J | Student assignment portal, `/student/assignments/[id]?memberId=...` | Link-based submit and one-shot legacy AI grade; teacher detail page shows per-member share links; student page renders assignment attachments through member-bound public routes; duplicate submission returns a user-visible 409 state. | No student history/auth. | `StudentShareLinksClient.tsx`, `app/student/assignments/[id]/*`, `app/api/ai/grade/route.ts`, `app/api/public/assignments/*` |
| K | Template library, `/templates` | Create/list/search/filter/edit/publish/unpublish/delete templates. Content edits use structured section/activity/resource fields. Publish previews snapshot metadata and stores immutable content in marketplace. | Delete blocks active marketplace listings. | `TemplatesClient.tsx`, `app/api/templates/*` |
| L | Marketplace, `/marketplace` | Browse active listings, search/filter by q/audience/HSK/type, copy listing into own template library, increment copy count, show loading/error/empty states. | Free sharing only. No payments or ownership mutation of source listing. | `MarketplaceClient.tsx`, `app/api/marketplace/templates/*` |
| M | Textbook template shell, `/textbook-templates` | Disabled UI shell, mock unavailable textbooks, warning banner, generate route returns 503. | No textbook DB, units, content preview, or AI generation. Do not invent upload/OCR/manual-input source until model is decided. | `TextbookTemplateClient.tsx`, `app/api/textbooks/*`, `app/api/ai/textbook-template/generate/route.ts` |

## Status Summary

| Area | Status |
|---|---|
| Core course/lesson/editor flow | MVP implemented |
| File upload and editor file attachment | MVP implemented, including public-safe attachment access, search/filter/rename |
| YouTube link + PDF fallback | MVP implemented |
| YouTube AI extraction | MVP implemented, output options and nested result editing present |
| Chinese generator in HSK block | MVP implemented; editor save/history and shared audience selector implemented |
| Lesson plans/prompts | MVP implemented; search, duplicate prompt, and structured plan editing present |
| Assignments/course-plan attachments | MVP implemented in course-plan and standalone new-assignment flows |
| Writing rubric/evaluation | MVP implemented for current teacher workflow |
| Student portal | MVP partial: works only with `memberId`, shows attachments and duplicate-submit errors, no student account/history |
| Templates/marketplace | MVP implemented; structured template editing and immutable marketplace snapshots present |
| Textbook templates | Shell only |

## Implementation Criteria

- A feature is "MVP implemented" only when page/component/API/ownership/loading/error/empty states are all present enough for the current user flow.
- "API exists" is not equal to "UI implemented"; keep those separate in status notes.
- Teacher-owned resources must be filtered by `userId` or by ownership chain through lesson/course.
- File APIs must not expose disk paths; block content must store safe metadata only.
- Student portal URLs must include `memberId` and validate member belongs to assignment owner.
- Rubrics should be reused for evaluations. If replacing a rubric, add an explicit assignment update flow.
- Re-evaluation must append a new row, not overwrite history.
- Marketplace copy must create an independent private `Template`.
- Textbook shell stays disabled until data model/source is defined.

## Remaining Missing UI

| Priority | Gap | Why |
|---|---|---|
| P2 | Textbook template implementation | Source model, unit schema, permissions, and generated-output target are still undecided. |
| P3 | Cross-feature i18n pass | Newer touched paths still contain Korean literals; targeted cleanup should happen with future feature work. |
