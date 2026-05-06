# Project Summary

---

## 2026-05-04 18:xx — LLM MVP Implementation

**feat: align repo with MVP spec (dlmon_llm_implementation_prompt.md)**

- chore: set default local LLM model to `qwen3:30b`; env override `LOCAL_LLM_MODEL` preserved
- feat: add `PATCH /api/lessons/[lessonId]/blocks` — atomic block save with Lesson→Course→User ownership check; fixes 임시 저장 bug
- feat: wire EditorToolbar 임시 저장 button to new PATCH endpoint (loading/success/error states)
- deprecate: mark `POST /api/lessons/[lessonId]/save` and `POST /api/ai/grade` as deprecated; kept for backward compat
- feat: extend `Member` model — `email` now optional, added `className`, `metadata`, `deletedAt`
- feat: add `WritingRubric` and `WritingEvaluation` Prisma models; extend `Assignment` and `Submission`
- feat: add `lib/writing-evaluation.ts` — shared types, defaults, AI prompt builders, score normalizer
- feat: add `POST /api/ai/writing-rubrics/generate` — AI or manual rubric creation
- feat: add `POST /api/writing-submissions` — teacher-side submission record creation
- feat: add `POST /api/ai/writing-evaluations/evaluate` — first-time rubric-based evaluation with ownership checks
- feat: add `POST /api/writing-evaluations/[evaluationId]/reevaluate` — versioned re-evaluation (new row, never overwrites)
- feat: add `PATCH /api/writing-evaluations/[evaluationId]/comment` — update teacher comment independently
- feat: add `GET /api/writing-rubrics/[rubricId]`, `PATCH /api/writing-rubrics/[rubricId]/archive`
- feat: add `GET /api/writing-evaluations/[evaluationId]`
- refactor: clean up Chinese block palette — remove 성조 연습, 한자 분석, 문화 비교, 영상 자막 분석; keep HSK 텍스트 분석; merge into 유튜브 미디어 추출
- feat: add `youtube-link` block type — `YouTubeLinkBlock.tsx` (thumbnail + title + link, no QR/transcript)
- feat: add `POST /api/youtube/metadata` — parse YouTube URL, fetch oEmbed title, derive thumbnail
- fix: replace unavailable `Youtube` lucide icon with `PlayCircle` in EditorCanvas and YouTubeLinkBlock
- fix: `MembersClient` Member interface `email: string | null`; null-safe filter
- fix: `DeductionPolicy` index signature for TypeScript compatibility
- fix: `SentenceFeedback` map explicit return type annotation
- chore: `npx prisma db push` — SQLite schema synced
- build: `npm run build` passes — 28 routes, TypeScript clean

---

## 2026-05-05 — YouTube AI Import Feature

**feat: implement async YouTube AI import with job tracking, audio pipeline, and STT**

- feat: add `MediaImportJob`, `MediaTranscriptChunk`, `ImportedMediaContent` Prisma models; add `User.importJobs` relation
- chore: add import-media env vars to `.env` (`OLLAMA_STT_MODEL`, `IMPORT_MEDIA_*`)
- feat: add `lib/import-media/types.ts` — all shared TypeScript types + `JOB_STATUS_LABELS` map
- feat: add `lib/import-media/constants.ts` — env-driven config (temp dir, chunk seconds, size limits, retention flags)
- feat: add `lib/import-media/youtube-metadata.ts` — `fetchYouTubeMetadata()` via yt-dlp `--dump-json` + oEmbed fallback; `extractVideoId()` supports watch/shorts/embed/youtu.be
- feat: add `lib/import-media/youtube-transcript.ts` — `fetchYouTubeTranscript()` via yt-dlp subtitle download; SRT/VTT parser with deduplication; lang priority zh-Hans > zh > en; caption files cleaned up after parse
- feat: add `lib/import-media/audio-download.ts` — `downloadYouTubeAudio()` via yt-dlp WAV extract into job-specific temp dir; max-filesize guard
- feat: add `lib/import-media/audio-processing.ts` — `processAudio()` normalizes to 16 kHz mono WAV (ffmpeg) then splits into configurable chunks (ffmpeg segment)
- feat: add `lib/import-media/audio-cleanup.ts` — `AudioCleanupService` deletes entire job temp dir; never exposes paths; called after successful transcription AND in finally block
- feat: add `lib/import-media/speech-to-text.ts` — `STTProvider` abstraction; `OllamaWhisperProvider` sends base64 audio via Ollama images field; `SpeechToTextService.transcribeChunks()` merges ordered results; TODO comment for future native Ollama audio endpoint
- feat: add `lib/import-media/ai-content.ts` — `generateImportedContent()` uses qwen3:30b with system+user prompt from spec; JSON validated with `validateAIResult()`; auto-repaired with `repairAIResult()` on failure
- feat: add `lib/import-media/job-processor.ts` — `processImportJob()` orchestrates all services; caption-first then audio fallback; audio deleted immediately after transcription success; finally block cleans up on failure unless `RETAIN_AUDIO_ON_FAILURE=true`; `audioStoragePath` stored internally, never returned
- feat: update `POST /api/ai/import-media` — new job format (`sourceType` in body) creates `MediaImportJob` and triggers `processImportJob` via `after()`; old `{ url }` format falls through to legacy sync path for MediaImportBlock backward compat
- feat: add `GET /api/ai/import-media/jobs/[jobId]` — returns `JobStatusResponse`; `audioStoragePath` intentionally excluded
- feat: add `POST /api/ai/import-media/jobs/[jobId]/save` — upserts `ImportedMediaContent`; requires `status === "completed"` and teacher ownership
- feat: add `app/(dashboard)/materials/import/youtube/page.tsx` server component wrapper
- feat: add `components/dashboard/ImportYouTubeClient.tsx` — full 3-step UI: form (URL, audience, HSK, output options, transcript policy) → processing (2s polling, progress steps, thumbnail) → result (editable sections, save-as selector) → saved confirmation
- feat: add "YouTube AI 교재" nav item to dashboard sidebar (FileDown icon)
- chore: `npx prisma db push` — 3 new tables created
- build: `npm run build` passes — 29 routes, TypeScript clean

---

## 2026-05-05 — Verification Pass

**chore: verify schema and build integrity after YouTube AI Import feature**

- chore: `npx prisma db push` — schema already in sync; Prisma Client regenerated (v6.19.3)
- build: `npm run build` passes — 44 routes, TypeScript clean
- note: Turbopack warning on `next.config.ts` NFT trace via `app/api/ai/import-media/route.ts` (non-blocking; caused by dynamic `child_process` usage in yt-dlp exec calls)

---

## 2026-05-05 — STT Fix + Debug Logging

**fix: replace broken Ollama Whisper approach; add pipeline debug logging**

- fix: `lib/import-media/speech-to-text.ts` — replace `images` field in `/api/generate` (vision model API, caused "I don't see an image" response) with correct `POST /v1/audio/transcriptions` multipart/form-data (Ollama OpenAI-compatible STT endpoint, requires Ollama ≥ 0.6.0)
- feat: add debug logging to `speech-to-text.ts` — file existence/size check, endpoint URL, HTTP status, raw response, transcript length + preview
- feat: add debug logging to `audio-download.ts` — yt-dlp command, stdout/stderr, saved file path + size
- feat: add debug logging to `audio-processing.ts` — ffmpeg normalize/chunk commands, stderr, chunk list
- feat: add stage logging to `job-processor.ts` — START/COMPLETED/FAILED markers, caption availability, STT provider + model, transcript lengths
- fix: TypeScript error in `job-processor.ts` — access `captionResult.source` / `.reason` after discriminated union narrowing
- build: `npm run build` passes — TypeScript clean

---

## 2026-05-05 — Full UI Audit + Bug Fixes

**fix: resolve all UI bugs found during static component audit (44 files)**

- fix: `app/api/ai/import-media/route.ts` legacy path — replace `images[]` Whisper call (vision model API, root cause of "I don't see an image" error in 유튜브 미디어 추출 editor block) with `POST /v1/audio/transcriptions` multipart; same fix as speech-to-text.ts
- fix: `components/editor/EditorToolbar.tsx` — accept `initialStatus` prop; publish button now correctly shows "게시 취소" for already-published lessons instead of always defaulting to "발행"
- fix: `app/(dashboard)/editor/[lessonId]/page.tsx` — pass `lesson.status` to `EditorToolbar` as `initialStatus`
- fix: `app/(dashboard)/assignments/new/AssignmentFormClient.tsx` — add `submitError` state; show user-visible error banner when API returns non-ok (was silently `console.error`)
- fix: `components/dashboard/CourseForm.tsx` — add `finally { setLoading(false) }` so spinner doesn't hang if API returns ok but no `id`; add `generateError` state and error banner
- fix: `components/dashboard/CourseCard.tsx` — delete confirmation dialog Korean ("이 작업은 취소할 수 없습니다.", "취소", "삭제" replacing English "Cancel", "Delete")
- fix: `app/(dashboard)/assignments/[id]/page.tsx` — student share link uses `process.env.NEXTAUTH_URL || 'http://localhost:3000'` instead of hardcoded localhost
- build: `npm run build` passes — TypeScript clean

---

## 2026-05-05 — Dev Server UI Audit + Layout Fix

**fix: resolve React setState-during-render error in DashboardLayout**

- fix: `app/(dashboard)/layout.tsx` — move `router.push('/login')` from render body into `useEffect([status, router])`; add `status === 'unauthenticated'` to the loading guard so the spinner is shown while the redirect fires; eliminates "Cannot update a component while rendering a different component" React error
- audit: opened all dashboard routes via Playwright (dashboard, /courses, /courses/new, /members, /assignments, /assignments/new, /materials/import/youtube) — no console errors, no visual regressions

---

## 2026-05-05 — YouTube Link Block + Media Extract Pipeline Fix

**fix: YouTube link block now renders playable embed in editor; PDF export uses static fallback**

- fix: `components/editor/blocks/YouTubeLinkBlock.tsx` — replace thumbnail-only card with responsive 16:9 YouTube `<iframe>` embed; video is now playable directly in the lesson editor and preview mode; the old static card is kept as a hidden `data-yt-pdf-fallback` sibling div for PDF capture
- fix: `components/editor/EditorToolbar.tsx` — `handleExportPdf` now swaps YouTube embeds to static fallbacks before html2canvas capture (`[data-yt-embed]` hidden, `[data-yt-pdf-fallback]` shown) and restores them unconditionally in `finally`; PDF output shows thumbnail + title + original link instead of a blank iframe area
- fix: `app/api/ai/import-media/route.ts` — rewrite `handleLegacyRequest` (used by MediaImportBlock / 유튜브 미디어 추출 editor block) to use the full `lib/import-media/*` pipeline instead of the old `lib/youtube.ts` helpers; root cause of "I don't see any audio provided" was MP3 file sent with `audio/wav` MIME type to Ollama Whisper; new path: captions first → WAV audio download → 16 kHz mono normalization → chunked STT via Ollama `/v1/audio/transcriptions` → `generateImportedContent`; added structured error codes (`YOUTUBE_AUDIO_DOWNLOAD_FAILED`, `AUDIO_FILE_MISSING_OR_EMPTY`, `TRANSCRIPTION_FAILED`, `IMPORT_FAILED`) per spec; full stage logging added
- fix: `components/editor/blocks/MediaImportBlock.tsx` — error display now reads `err.message` first (then falls back to `err.error`) so user-facing Korean error messages are shown instead of error code strings

---

## 2026-05-05 — Full QA Pass + Bug Fixes (Playwright browser automation)

**fix: 7 confirmed bugs found and resolved via live browser QA across all dashboard routes**

### Bugs Fixed

- fix(i18n): `app/(dashboard)/layout.tsx` — 3 sidebar nav labels + account badge used hardcoded Korean strings, ignoring language toggle; added `members`, `assignments`, `youtubeImport`, `memberType` keys to `lib/translations.ts` (ko + en) and replaced literals with `{t.common.*}`
- fix(i18n): `components/dashboard/CourseCard.tsx` — delete modal body, cancel/delete buttons, "lessons" count badge, "progress" label all hardcoded Korean; wired to new `dashboard.deleteWarning`, `dashboard.cancel`, `dashboard.delete`, `dashboard.weeks`, `dashboard.progress` translation keys
- fix: `components/dashboard/CourseCard.tsx` — `handleDiscard` (delete flow) never called `setDeleting(false)` on non-ok API responses; course card was permanently stuck in deleting state after a failed delete
- fix(i18n): `components/dashboard/CurriculumEditor.tsx` — "add week" button rendered "16주차 주차 추가" (duplicated 주차 word); removed redundant `{t.plan.week}` from button label
- fix(i18n): `components/editor/blocks/HeadingBlock.tsx`, `TextBlock.tsx`, `QuizBlock.tsx` — all had hardcoded English placeholders ("Enter heading...", "Type something...", "Enter your question here...", "Enter option..."); added `useLanguage` + wired to `t.editor.placeholders.*`; added `saving`, `savedDraft`, `generatingPdf` keys to translations
- fix(i18n): `components/editor/EditorToolbar.tsx` — 3 hardcoded Korean strings (임시 저장 완료, 저장 중..., 생성 중...); wired to `t.editor.savedDraft`, `t.editor.saving`, `t.editor.generatingPdf`
- fix(ux): `components/editor/blocks/HeadingBlock.tsx`, `TextBlock.tsx` — preview mode rendered editable `<input>`/`<textarea>` instead of semantic HTML; added `isPreview` branch: empty blocks return null, content blocks render `<h1>`/`<h2>` or `<p>` respectively

### Confirmed Working (no regressions)

- Login + NextAuth CredentialsProvider flow (test@example.com bypass, unknown-email auto-create)
- Dashboard stats page render
- Course list, CourseCard render, delete modal flow
- Course creation form → AI curriculum plan generation (AI pipeline — not testable without model)
- Lesson editor: add blocks, drag-reorder, delete, save draft (PATCH /api/lessons/[id]/blocks), preview toggle
- Members: empty state, invite modal (validation + submit + table update), search filter (match + no-results)
- Assignments: create (form validation, lesson dropdown, submit + redirect), list, detail view (stats, prompt, share link, empty submissions)
- YouTube AI import: form render, empty-URL validation (browser required + JS guard), checkbox toggles, transcript policy options
- Settings: load from API, save (savedFlash 2.5s feedback, language sync via setLanguage)
- Syllabi: list with search, view link → syllabus detail render (breadcrumb, content sections, print/PDF buttons)

### Known Remaining Issues (not fixed — require large-scope i18n refactor)

- `components/dashboard/MembersClient.tsx` — no `useLanguage`, all strings hardcoded Korean; page does not respond to language toggle
- `app/(dashboard)/assignments/new/AssignmentFormClient.tsx` — same: no `useLanguage`, fully hardcoded Korean
- `app/(dashboard)/assignments/[id]/page.tsx` — server component; cannot use hook; all labels/strings hardcoded Korean
- `components/dashboard/ImportYouTubeClient.tsx` — no `useLanguage`, all strings hardcoded Korean
- `app/(dashboard)/settings/page.tsx` — partially uses `t.common.settings` for heading, but all section labels, descriptions, and button text are hardcoded Korean

---

## 2026-05-06 — Codebase Map Documentation

**docs: create docs/codebase-map.md — token-saving navigation guide for future Claude sessions**

- docs: created `docs/codebase-map.md` with 6 sections: top-level structure, feature map, route map, database map, token-saving read guide, deprecated/risky areas
- docs: feature map covers all 18 planned features; 4 not-yet-implemented features (HWP upload, PDF rendering, marketplace, textbook template) marked `Status: Not found`
- docs: route map lists all 17 frontend routes and 30 API routes with deprecation markers
- docs: database map covers all 14 Prisma models with notes on suspicious gaps (`materialId` in `ImportedMediaContent` has no `Material` model; no `Template`/`Marketplace` model yet)
- docs: token-saving read guide provides ordered file lists for 12 common task types
- docs: deprecated/risky area table flags 10 files/fields including `audioStoragePath` leak risk, legacy `aiScore`/`aiFeedback` on `Submission`, removed block components, and `docker-compose.yml` PostgreSQL/SQLite mismatch

---

## 2026-05-06 — CLAUDE.md Rewrite

**docs: rewrite CLAUDE.md with commands, architecture, and project rules for future Claude sessions**

- docs: replaced placeholder `CLAUDE.md` (was just `@AGENTS.md` + Project Summary reminder) with full guidance file
- docs: added commands section — `npm run dev/build/lint`, `npx prisma db push/studio`, seed script, test credentials
- docs: documented auth pattern (`requireUserOrUnauthorized` / `requireUserOrRedirect` from `lib/auth-helpers.ts`) and dev-only test-user fallback
- docs: documented AI client (`lib/ai/client.ts`) and separate Whisper STT endpoint distinction
- docs: documented lesson editor state architecture (`EditorContext` → `EditorCanvas` → `BlockRegistry`) and removed-but-present block files
- docs: documented YouTube import pipeline (9-module async job, caption-first strategy, `audioStoragePath` security rule)
- docs: documented writing evaluation append-only pattern and rubric snapshot rule
- docs: documented JSON-in-SQLite fields that require manual parse/stringify
- docs: documented i18n gap (4 components not yet wired to `useLanguage`)
- docs: preserved existing `@AGENTS.md` include and Project Summary update rule
- docs: added reference link to `docs/codebase-map.md`
