# Project Summary: Letto Teacher Studio (KeYi Studio)

**KeYi Studio (可意工作室)**
**Status:** MVP + Phase 3 feature set implemented
**Last Updated:** 2026-05-26

---

## Maintenance Rule

This file is the current-state project summary, not a chronological changelog.

When future work changes the product, update only the essential result for the affected feature:

- Add newly completed capabilities that matter to future work.
- Modify stale behavior, architecture, command, or risk notes.
- Delete obsolete implementation notes and resolved debt.
- Keep detailed timelines, commit-style logs, and file-by-file implementation history out of this file.

---

## Product Snapshot

Letto Teacher Studio is a Chinese Teaching Management System for teachers. It supports course planning, lesson material creation, Chinese-specific AI tools, teacher-managed students, assignment workflows, and writing evaluation.

Core stack:

- Next.js 16 App Router, React 19, Tailwind CSS 4.
- Prisma + SQLite for local data.
- NextAuth Credentials provider.
- Vercel AI SDK with an OpenAI-compatible local LLM endpoint.
- Local AI defaults live in `lib/ai/client.ts`; `LOCAL_LLM_MODEL` and `LOCAL_LLM_URL` remain the provider/model override points.

MVP scope:

- Teachers log in and manage students as `Member` records.
- Students do not have login accounts in the MVP.
- The existing link-based student assignment portal remains for compatibility, but teacher-side workflows are primary.

---

## Major Implemented Capabilities

### Course, Curriculum, and Syllabus

- Course dashboard, course list, curriculum planning, and syllabus pages use real persistence instead of mock-only UI.
- Curriculum weeks can be added, edited, and deleted through the UI.
- Syllabi can be edited, saved, printed, and exported to PDF.
- Dashboard and course queries were consolidated to avoid avoidable N+1 reads.

### Lesson Editor

- Lesson blocks are saved through `PATCH /api/lessons/[lessonId]/blocks` with ownership checks and ordered block persistence.
- Active block types are `heading`, `text`, `image`, `video`, `quiz`, `youtube-link`, `file-attachment`, `text-analyzer`, and `youtube-extract`.
- `media-import` remains as a backwards-compatible alias for old saved lesson blocks.
- PDF export swaps playable YouTube iframes to static thumbnail/title/link fallbacks before capture.

### Members and Assignments

- `Member` is the student record model; email is optional, `className`, `metadata`, and `deletedAt` support MVP student management.
- Member deletion is soft-delete and is blocked when active submissions exist.
- Assignment creation and detail views enforce teacher ownership.
- Assignment detail includes editing fields, HSK/audience settings, example prompts, and AI-assisted assignment prompt generation.
- Teacher assignment detail shows per-member student links with copy/open actions.
- Assignment attachments work in both `/courses/[id]/plan` and `/assignments/new`, and the student portal can preview/download attached files through member-bound public routes.
- The legacy student submission route blocks duplicate `assignmentId + memberId` submissions and surfaces the existing submission state.

### Writing Evaluation

- Rubric-based writing evaluation is implemented with `WritingRubric` and append-only `WritingEvaluation` records.
- Evaluations store rubric snapshots; re-evaluation creates a new row and links to the previous evaluation.
- Teacher-side assignment detail supports entering writing, generating/reusing rubrics, evaluating, adding comments, and re-evaluating.
- Deprecated `Submission.aiScore` / `Submission.aiFeedback` and `/api/ai/grade` remain only for backwards compatibility.

### AI Tools

- Chinese vocabulary/sentence generation is available as a standalone tool and inside the editor HSK analysis block.
- Generated Chinese items can be saved to history and reloaded.
- Standalone and editor Chinese generation share the same audience selector values.
- Standalone lesson plan generation supports saved prompts, prompt search/duplicate, generated plans, and structured saved-plan editing.
- AI routes use shared timeout/error handling and `cleanAiJsonResponse()` for model outputs that include thinking blocks or markdown fences.

### YouTube Import and YouTube Link Blocks

- `youtube-extract` performs asynchronous YouTube media import with metadata, captions-first transcript retrieval, audio/STT fallback, AI material generation, job polling, nested result editing, and save-to-record support.
- YouTube import save targets are intentionally limited to `lesson_material` until another UI entry point exists.
- `youtube-link` is separate and display-only: it stores a YouTube URL, video ID, title, thumbnail, and original link for browser rendering and PDF fallback.
- Simple YouTube link blocks do not add QR codes, transcript generation, audio download, or AI summaries.

### Files and Attachments

- PDF/HWP/HWPX upload is implemented with a 100 MB limit, conversion status tracking, and LibreOffice-based HWP/HWPX to PDF conversion where available.
- File APIs support upload, list, metadata, preview, download, retry conversion, rename/description update, and delete.
- File library UI supports search, type/status filtering, and inline rename/description editing.
- Internal disk paths such as `storagePath` and `convertedPath` must not be returned by APIs.
- Lesson editor file attachment blocks can choose existing files or upload new ones.

### Templates, Marketplace, and Textbook Shell

- Private templates and free marketplace sharing are implemented.
- Template editing uses structured metadata/section/activity/resource fields instead of raw JSON editing.
- Publishing creates an immutable marketplace snapshot; copying creates an independent private template and increments copy count.
- Template and marketplace lists support search/filter flows, including marketplace type filtering.
- Marketplace is free sharing only; no payment, purchase, revenue, or settlement logic exists.
- Textbook template UI is a shell only. Real textbook database integration and AI generation are intentionally disabled until that data model is decided.

### Internationalization

- Korean/English language state is handled by `context/LanguageContext.tsx`.
- New or edited UI should use `useLanguage()` and `lib/translations.ts`.
- Some older feature UIs still contain Korean literals; treat i18n cleanup as targeted follow-up work when touching those areas.

---

## Current Architecture Rules

- API route handlers should use `requireUserOrUnauthorized()` and filter database operations by the returned teacher `userId`.
- Server-component pages should use `requireUserOrRedirect()`.
- Development auth fallback is explicit only through `TEST_USER_ID`; do not reintroduce implicit first-user or unauthenticated fallbacks.
- `lib/auth.ts` uses scrypt-hashed passwords and upgrades legacy plaintext passwords after successful login.
- Any route using Node APIs such as `fs`, `path`, `os`, or `child_process` must use Node runtime.
- JSON stored in SQLite text fields must be stringified on write and parsed on read.
- Uploaded files are viewer resources, not AI input. Do not add OCR or AI ingestion of uploaded files unless the product scope changes.
- YouTube audio storage paths and uploaded-file disk paths are internal-only fields.

---

## Run and Verify

Common commands:

```powershell
npm run dev
npm run build
npm run lint
npx prisma validate
npx prisma db push
```

Local login:

- Seeded account: `test@example.com` / `password`.
- Any-password test-user bypass requires `ALLOW_DEV_ANY_PASSWORD_FOR_TEST_USER=true` in development.

Before finishing meaningful code changes, run the narrowest relevant checks and `npm run build` when route, schema, or TypeScript behavior changed.

---

## Active Open Items

- Textbook templates need real textbook/unit persistence before AI generation can be enabled.
- Student accounts, student dashboard, and student history remain outside MVP scope.
- Some old lesson rows may still use `media-import`; keep the alias until a one-time data migration is done.
- Some feature UI strings still need targeted i18n cleanup.
- Local AI model choice and timeout values should remain configurable per environment.
