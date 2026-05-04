# Project Summary: Letto Teacher Studio (KeYi Studio)

**KeYi Studio (可意工作室)**
**Status:** Phase 2 (Backend Consolidation & UI Wiring) In Progress
**Last Updated:** May 1, 2026

---

## 1. Executive Summary

Letto Teacher Studio is a specialized **Chinese Teaching Management System (CTMS)**. The platform supports end-to-end management of Chinese language courses, from AI-driven curriculum planning to automated student assignment grading.

Phase 2 focused on cleaning up technical debt: removing a defunct second backend, consolidating an auth-bypass pattern duplicated across pages, replacing several mock UI flows with real persistence, and wiring up dead buttons.

## 2. Completed Milestones

### Phase 1 — Core Features & AI Verification (previously completed)

- Next.js 16 (App Router), Prisma + SQLite, NextAuth (Credentials provider).
- Vercel AI SDK with local Ollama / LM Studio support.
- AI Syllabus Generator (8-week HSK curriculum), Assignment dashboard, Pinyin/HSK linguistic tools, Magic Link student portal, instant AI grading.

### Phase 2 — Backend Consolidation & UI Wiring (this commit, 2026-05-01)

#### 2026-05-01 14:30 — chore: extract dlmon as standalone git repo
- Initialized fresh `.git` repo at `I:\dev\dlmon` with current state as initial commit.
- Created dated branch `2026-05-01` for ongoing Phase 2 work.

#### 2026-05-01 14:45 — chore: delete dead `backend/` folder
- The standalone `backend/` directory (Express + own Prisma + own SQLite) was unreachable from any UI code (0 imports across the project), had no run script, and shipped a Postgres schema incompatible with the live SQLite schema.
- Its only feature (`AIEvaluator` class shelling out to Ollama CLI) was already replaced by `app/api/ai/grade/route.ts` using the Vercel AI SDK as documented in Phase 1.
- Verdict: dead code from an earlier prototype — removed.

#### 2026-05-01 15:00 — refactor(auth): consolidate session-or-test-user bypass into a single helper
- New `lib/auth-helpers.ts` exposes `getCurrentUserId()`, `requireUserOrRedirect()`, and `requireUserOrUnauthorized()`.
- Replaced the duplicated 10-line "if no session, fall back to `test@example.com` or `findFirst`" snippet in 4 files: `app/api/assignments/route.ts`, `app/(dashboard)/assignments/page.tsx`, `app/(dashboard)/assignments/[id]/page.tsx`, `app/(dashboard)/assignments/new/page.tsx`.
- Bypass behavior is preserved (test-user fallback) but is now in one place. Flipping to strict auth is now a one-line change.
- ⚠️ Known security debt: `lib/auth.ts` still does plaintext password comparison and contains a `test@example.com` no-password backdoor. Tier-1 fix deferred at user request.

#### 2026-05-01 15:10 — perf(dashboard): fix N+1 query
- `app/(dashboard)/dashboard/page.tsx` previously called `prisma.lesson.findMany` once per course in a loop. Replaced with a single `findMany` using `include: { lessons: true }`.
- Same fix applied to `app/(dashboard)/courses/page.tsx`.
- Replaced `studentViews: 128 // Mock for now` with a real `prisma.submission.count` aggregated for the teacher's members.

#### 2026-05-01 15:25 — feat(members): replace hardcoded mock list with real CRUD
- `app/(dashboard)/members/page.tsx` was a 4-row hardcoded array with no DB connection and no working buttons.
- Now: server component that loads `prisma.member.findMany({ where: { userId } })` and hands data to a new `components/dashboard/MembersClient.tsx`.
- New client component implements: search filter (was decorative), invite-member modal posting to `POST /api/members`, per-row delete with confirmation calling `DELETE /api/members/:id`.
- New routes: `app/api/members/route.ts` (GET, POST) and `app/api/members/[id]/route.ts` (PATCH, DELETE). Includes ownership checks and a guard that prevents deleting members with existing submissions.

#### 2026-05-01 15:45 — feat(settings): wire Settings page to real persistence
- Added `displayName`, `language` (default "ko"), and `aiMode` (default true) fields to `User` model. **Requires `npx prisma migrate dev --name add_user_settings`.**
- New `app/api/settings/route.ts` exposes GET (current user's settings) and PATCH (update displayName, email, language, aiMode).
- Rewrote `app/(dashboard)/settings/page.tsx`: loads current settings on mount via `useEffect`, all fields are controlled inputs (no more `defaultValue` ghosts), Save button now actually persists. Replaces the old fake `setTimeout(800ms) + alert` handler.
- Language preference now syncs back into the in-memory `LanguageContext` after save.

#### 2026-05-01 16:05 — feat(curriculum): wire Edit Week / Add Week / Delete Week
- `components/dashboard/CurriculumEditor.tsx` previously had three buttons with no `onClick`: per-week edit pencil, "Edit" inside expanded week, and the "Add Week" button at bottom.
- Added an Edit Week modal with inputs for topic / objectives / activities / assessment, plus Add Week and Delete Week actions.
- New `app/api/curriculum/[courseId]/route.ts` PATCH handler upserts the JSON-blob plan in `CurriculumPlan.data` and keeps `Course.weeks` in sync.

#### 2026-05-01 16:20 — feat(syllabus): make Save actually save + inline edit mode
- `components/dashboard/SyllabusActions.tsx` Save button previously sets a fake "saved!" status and doesn't write anything.
- Refactored: SyllabusActions now owns the rendered syllabus body and a toolbar with Print, PDF Export, Edit, Save, Cancel. Edit mode swaps the rendered markdown for a textarea; Save sends content to `PATCH /api/syllabus/:courseId` (new route).
- Updated `app/(dashboard)/courses/[id]/syllabus/page.tsx` to pass `courseId` and `initialContent` to the client component.
- The list view (`SyllabiClient.tsx`) Download and Print row buttons now open the syllabus page so the user can use the working PDF/print functionality, instead of being dead.

#### 2026-05-01 16:30 — feat(search): wire decorative search inputs
- `components/dashboard/MyCoursesClient.tsx` and `components/dashboard/SyllabiClient.tsx` had search inputs with no `onChange` and no state. Added client-side filtering on title.

#### 2026-05-01 16:40 — chore: misc cleanups
- `lib/auth.ts`: `debug: true` → `debug: false`. Auth provider was logging every email + auth result on every request.
- Root `.gitignore`: added `*.db`, `*.db-journal`, and `build_output*.txt`. The committed `dev.db` was 46 MB and growing.

#### 2026-05-01 16:50 — fix(syllabi): clean up wasted requests in download handler
- Self-review caught a buggy `handleDownload` in `components/dashboard/SyllabiClient.tsx`: it issued a GET against the syllabus PATCH-only API route (would 405) and a HEAD request against the page that did nothing useful. Replaced with a direct `window.open` to the syllabus detail page where the working PDF export lives.

---

## 3. Action Required Before Phase 3 Can Build

The following commands must be run **on your machine** before `npm run dev` will succeed:

```powershell
# 1. Remove the deleted backend folder
Remove-Item -Recurse -Force I:\dev\dlmon\backend

# 2. Apply the new User schema fields
cd I:\dev\dlmon
npx prisma migrate dev --name add_user_settings

# 3. (Optional) untrack the now-ignored dev.db from git
git rm --cached dev.db
git commit -m "chore: stop tracking dev.db"
```

---

## 4. Open Items / Known Debt

- **Auth security (deferred per user direction)**: `lib/auth.ts` still uses plaintext password comparison and has a `test@example.com` no-password backdoor; first-time login auto-creates the user. Tier-1 hardening (bcrypt + remove backdoor + remove auto-create) is the single biggest outstanding risk.
- **Bypass fallback in `lib/auth-helpers.ts`**: `getCurrentUserId()` still falls back to the seeded test user when no session is found, to avoid breaking dev workflows. To enable strict auth, remove the fallback branch in that file.
- **Other API routes** (`app/api/courses/generate/route.ts`, `app/api/courses/from-template/route.ts`) still call `getServerSession` directly — they were not part of this milestone. Could be migrated to `requireUserOrUnauthorized()` for consistency.

---

## 5. How to Run & Verify

1. Run the three commands in §3.
2. `npm run dev`
3. Visit [http://localhost:3000/login](http://localhost:3000/login).
4. Test account: `test@example.com` / any password (the dev backdoor is still in place; see §4).

---

**This document serves as the official record of development progress for KeYi Studio.**
