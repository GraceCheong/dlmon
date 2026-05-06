# LLM Implementation Prompt for `GraceCheong/dlmon`

Repository:

```text
https://github.com/GraceCheong/dlmon.git
```

You are working on an existing Next.js project. Do **not** rebuild from scratch. Extend and refactor the current codebase.

---

## 0. Project Context

This repository is a Chinese teaching management platform called **Letto Teacher Studio / KeYi Studio**.

Current stack:

```text
Next.js 16
React 19
Prisma
SQLite
NextAuth
Vercel AI SDK
OpenAI-compatible local LLM endpoint
```

Existing domain models include:

```text
User
Member
Course
CurriculumPlan
Syllabus
Lesson
LessonBlock
Assignment
Submission
```

Important existing behavior:

```text
Member is currently used as the teacher-managed student/member record.
Submission currently stores submitted assignment content and simple AI grading fields.
The repository already has YouTube/media import logic.
The repository already has student portal code under app/student/*.
```

The implementation goal is to align the existing repository with the clarified MVP specification.

---

## 1. AI Model Change

Update the default local LLM model to:

```text
qwen3:30b
```

Likely file:

```text
lib/ai/client.ts
```

Expected behavior:

```ts
export const defaultModel = process.env.LOCAL_LLM_MODEL || 'qwen3:30b';
```

Requirements:

- Keep `LOCAL_LLM_URL` support.
- Keep `LOCAL_LLM_MODEL` override support.
- Do not hard-code provider logic into feature routes.
- Keep the local OpenAI-compatible endpoint behavior.

---

## 2. Student Portal Scope

The existing student portal code must **not** be deleted.

However, for MVP:

```text
Student portal is a Later feature.
Only teachers log in.
Students are teacher-managed records.
Teachers enter student writing submissions from the teacher dashboard.
```

Actions:

- Keep `app/student/*`.
- Do not expand student-side submission for MVP.
- Hide or isolate student portal from MVP navigation if currently exposed.
- Do not add new student login features.
- Do not make student-side submission the main MVP workflow.

---

## 3. Member vs Student

Do **not** create a separate `Student` table.

Use the existing `Member` model as the student record.

Extend `Member` as needed.

Suggested Prisma direction:

```prisma
model Member {
  id        String   @id @default(cuid())
  name      String
  email     String?
  role      String   @default("student")
  userId    String
  className String?
  metadata  Json?
  deletedAt DateTime?

  user        User         @relation(fields: [userId], references: [id])
  submissions Submission[]

  joinedAt  DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Requirements:

- `email` should be optional.
- Add `className`.
- Add `metadata`.
- Add `deletedAt`.
- Keep ownership scoped through `userId`.
- UI can label `Member` as "Student" or "학생", but the database model can remain `Member`.

---

## 4. Writing Evaluation Architecture

Adopt the separated evaluation architecture.

Current state:

```text
Submission directly stores aiScore and aiFeedback.
```

Target state:

```text
Submission = submitted writing/content record
WritingRubric = stored rubric generated during course/lesson/assignment setup
WritingEvaluation = versioned evaluation result
```

Core rules:

```text
Rubrics are not generated during every evaluation.
Rubrics are generated during course/lesson/writing assignment setup.
Each evaluation stores both rubricId and rubricSnapshot.
Re-evaluation creates a new WritingEvaluation row.
Previous evaluations must not be overwritten.
```

### 4.1 Add `WritingRubric`

Suggested Prisma model:

```prisma
model WritingRubric {
  id              String   @id @default(cuid())
  ownerId         String
  courseId        String?
  lessonId        String?
  assignmentId    String?
  hskLevel        String
  targetAudience  String
  criteria        Json
  deductionPolicy Json
  createdByAi     Boolean  @default(true)
  aiProvider      String?
  aiModel         String?
  version         Int      @default(1)
  status          String   @default("active")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  owner           User     @relation(fields: [ownerId], references: [id])
  evaluations     WritingEvaluation[]
}
```

### 4.2 Add `WritingEvaluation`

Suggested Prisma model:

```prisma
model WritingEvaluation {
  id                   String   @id @default(cuid())
  submissionId          String
  teacherId             String
  rubricId              String
  rubricSnapshot        Json
  rubricSource          String
  score100              Float
  score10               Float
  deductions            Json
  sentenceFeedback      Json
  overallSummary        String
  teacherComment        String?
  aiProvider            String?
  aiModel               String?
  evaluationVersion     Int      @default(1)
  previousEvaluationId  String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  submission            Submission     @relation(fields: [submissionId], references: [id])
  rubric                WritingRubric  @relation(fields: [rubricId], references: [id])
}
```

### 4.3 Extend `Assignment`

Suggested extension:

```prisma
model Assignment {
  // keep existing fields

  hskLevel        String?
  targetAudience  String?
  rubricId        String?
}
```

### 4.4 Extend `Submission`

Suggested extension:

```prisma
model Submission {
  // keep existing fields

  rubricId                 String?
  languageValidationStatus String?
  evaluations              WritingEvaluation[]
}
```

If Prisma relation naming requires adjustments, implement clean relation names.

### 4.5 Default Rubric Criteria

Default criteria:

```text
grammar
vocabulary
sentence_structure
logical_coherence
task_relevance
naturalness
```

Default deduction policy:

```text
Grammar: max 25
Vocabulary: max 20
Sentence structure: max 15
Logical coherence: max 15
Task relevance: max 15
Naturalness: max 10
Total: 100
```

Scoring formula:

```text
score100 = max(0, 100 - totalDeductions)
score10 = round(score100 / 10, 1)
```

---

## 5. Deprecate Old Grading Route

Existing route:

```text
app/api/ai/grade/route.ts
```

Do not remove it if the current student portal depends on it.

Actions:

- Keep it temporarily for backward compatibility.
- Add a clear deprecation comment.
- Do not route new teacher-side writing evaluation through it.
- Build new rubric-based evaluation APIs.

Create new routes:

```text
POST   /api/ai/writing-rubrics/generate
GET    /api/writing-rubrics/[rubricId]
PATCH  /api/writing-rubrics/[rubricId]/archive

POST   /api/writing-submissions
POST   /api/ai/writing-evaluations/evaluate
GET    /api/writing-evaluations/[evaluationId]
POST   /api/writing-evaluations/[evaluationId]/reevaluate
PATCH  /api/writing-evaluations/[evaluationId]/comment
```

New evaluation API behavior:

```text
Verify current teacher.
Verify teacher owns the Member, Assignment, Submission, and Rubric.
Validate writing input.
Load rubric.
Store rubric snapshot.
Call AI.
Store WritingEvaluation.
Return evaluation result.
```

Re-evaluation behavior:

```text
Load previous WritingEvaluation.
Use previous rubricSnapshot by default.
Create a new WritingEvaluation row.
Set previousEvaluationId.
Increment evaluationVersion.
Never overwrite previous evaluation.
```

---

## 6. YouTube and Media Import Clarification

There are two separate YouTube-related features. Do not merge them incorrectly.

---

### 6.1 Existing Feature: YouTube Media Extraction

Existing implemented feature:

```text
YouTube URL
→ audio download
→ Whisper transcription
→ AI lecture material generation
```

This feature should be kept.

Rename or consolidate it as:

```text
유튜브 미디어 추출
```

Code-friendly English name:

```text
YouTube Media Extraction
```

Likely files:

```text
app/api/ai/import-media/route.ts
lib/youtube.ts
components/editor/blocks/MediaImportBlock.tsx
components/editor/blocks/SubtitleAnalysisBlock.tsx
```

Requirements:

- Keep the existing YouTube audio download.
- Keep Whisper transcription.
- Keep AI lecture material generation.
- Keep this as a Chinese-specific block feature.
- Do not remove this pipeline.
- Add Node runtime declaration to routes using Node APIs.

Example:

```ts
export const runtime = "nodejs";
```

Use this when a route uses:

```text
fs
os
path
child_process
```

---

### 6.2 Different Feature: Lesson Material YouTube Link Block

This is the separate product feature:

```text
수업관리 > 수업 자료 제작 > 동영상 유튜브 링크 추가
```

This feature is **not** transcription.  
This feature is **not** summary generation.  
This feature is **not** audio download.

Purpose:

```text
When a teacher adds a YouTube link as a lesson material block,
the system needs formatted data for PDF rendering:
thumbnail image, video title, original YouTube link, and fallback display text.
```

Add or update a block type:

```text
youtube_link
```

Expected block data shape:

```ts
type YouTubeLinkBlockData = {
  url: string;
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  originalUrl: string;
  thumbnailStatus: "available" | "unavailable" | "failed";
};
```

Add API if not already present:

```text
POST /api/youtube/metadata
```

Request:

```json
{
  "url": "https://www.youtube.com/watch?v=..."
}
```

Response:

```ts
type YouTubeMetadataResponse = {
  videoId: string;
  title?: string;
  thumbnailUrl?: string;
  originalUrl: string;
  isThumbnailAvailable: boolean;
  isTitleAvailable: boolean;
};
```

Requirements:

- Parse `youtube.com/watch` URLs.
- Parse `youtu.be` URLs.
- Parse YouTube Shorts URLs.
- Derive thumbnail URL from `videoId` where possible.
- Try to fetch title using lightweight metadata, oEmbed, or existing metadata helper.
- If title fetch fails, allow manual title input.
- In PDF rendering, render:
  - thumbnail image or fallback placeholder
  - title
  - original link text

MVP exclusions for the simple YouTube link block:

```text
No QR code.
No transcript.
No AI summary.
No audio download.
```

---

## 7. Chinese-Specific Block Cleanup

Clean up the Chinese-specific block feature list.

Remove these features completely:

```text
성조 연습
한자 분석
문화 비교
```

Actions:

- Remove UI entries, buttons, tabs, or menu items for these features.
- Remove related components if unused.
- Remove related API routes if any.
- Remove related DB fields or tables if any exist and are only used by these features.
- Remove imports and dead references.
- Ensure the app builds after removal.

Keep:

```text
HSK 텍스트 분석
```

Consolidate these two visible features:

```text
영상 자막 분석
실생활 미디어 추출
```

into one visible feature:

```text
유튜브 미디어 추출
```

This consolidated feature should use the existing implementation:

```text
YouTube URL
→ audio download
→ Whisper transcription
→ AI lecture material generation
```

Final visible Chinese-specific block list should be:

```text
HSK 텍스트 분석
유튜브 미디어 추출
```

Do not leave these old labels visible:

```text
영상 자막 분석
실생활 미디어 추출
성조 연습
한자 분석
문화 비교
```

---

## 8. Lesson Material Creation: Temporary Save Bug

Bug:

```text
In 수업관리 > 수업자료 제작,
after composing lesson material content,
clicking "임시 저장" does not save the content.
```

Implement actual draft saving.

Find the relevant page/components for lesson material editing.

Likely areas:

```text
components/editor/*
LessonBlock
lesson editor pages
material creation/editor components
save/draft toolbar buttons
```

Expected behavior:

```text
Clicking 임시 저장 persists the current lesson material content.
The content reloads when the teacher returns to the page.
Block order is preserved.
Block content is preserved.
A success/error state is shown.
Duplicate saves are prevented while saving.
Save is scoped to the current teacher and lesson/course.
```

Use existing schema if possible:

```text
Lesson
LessonBlock
Syllabus
CurriculumPlan
```

If the material editor uses `LessonBlock`, implement draft save by upserting or replacing the lesson’s blocks.

Recommended API:

```text
PATCH /api/lessons/[lessonId]/blocks
```

Request shape:

```ts
type SaveLessonBlocksRequest = {
  blocks: Array<{
    id?: string;
    type: string;
    content: string;
    order: number;
  }>;
  status?: "draft" | "published";
};
```

Required backend behavior:

```text
Verify current teacher owns the parent course through Lesson → Course → User.
Transactionally update blocks.
Either delete old blocks and recreate ordered blocks, or upsert each block and delete removed ones.
Set Lesson.status = "draft" when temporary saving.
Return saved lesson and blocks.
```

Response shape:

```ts
type SaveLessonBlocksResponse = {
  success: true;
  lessonId: string;
  status: "draft";
  savedAt: string;
  blocks: Array<{
    id: string;
    type: string;
    content: string;
    order: number;
  }>;
};
```

Frontend requirements:

```text
Wire the 임시 저장 button to the new API.
Disable button while saving.
Show 저장 중... while saving.
Show 임시 저장 완료 on success.
Show a clear error message on failure.
Preserve current editor state after save.
```

---

## 9. File Resource / HWP Conversion Scope

The broader product specification includes:

```text
PDF/HWP/HWPX upload
100MB limit
HWP/HWPX server-side PDF conversion
```

But do **not** over-expand this task unless explicitly requested.

This prompt’s immediate implementation scope is:

```text
Qwen3:30b model change
Member extension
Writing evaluation architecture
YouTube/media clarification
Chinese-specific block cleanup
Temporary save bug
Simple YouTube link block for lesson material PDF rendering
```

Leave FileResource and HWP conversion for a separate implementation phase unless current edited code already depends on it.

---

## 10. Auth Note

Existing auth has development security debt:

```text
plaintext password comparison
auto-create user
test@example.com bypass
getCurrentUserId fallback to test/first user
```

Do not break the dev workflow unless explicitly instructed.

However, when creating new APIs:

```text
Use the existing auth helper consistently.
Keep ownership checks.
Do not create new unauthenticated routes.
Add TODO comments where strict auth hardening is needed.
```

Ownership checks must use:

```text
current teacher user id
relations through User → Course / Member / Assignment / Submission / Rubric
```

---

## 11. Implementation Order

Implement in this order:

```text
1. Change default local LLM model to qwen3:30b.
2. Add Node runtime declaration to media import route if it uses Node APIs.
3. Rename/consolidate Chinese-specific media features:
   - remove 성조 연습
   - remove 한자 분석
   - remove 문화 비교
   - keep HSK 텍스트 분석
   - merge 영상 자막 분석 and 실생활 미디어 추출 into 유튜브 미디어 추출
4. Fix 임시 저장 for lesson material creation.
5. Extend Member model as student record.
6. Add WritingRubric and WritingEvaluation models.
7. Add rubric generation API.
8. Add teacher-side writing submission/evaluation APIs.
9. Deprecate old /api/ai/grade for the new MVP flow.
10. Add simple YouTube link metadata/PDF-rendering data block for lesson material YouTube links.
11. Run Prisma migration.
12. Run lint/build and fix errors.
```

---

## 12. Acceptance Criteria

### AI Model

```text
Default local model is qwen3:30b.
LOCAL_LLM_MODEL override still works.
```

### Student Portal

```text
Existing student portal code remains.
It is treated as Later and not expanded for MVP.
```

### Member

```text
Member supports teacher-managed student use.
Member can store optional email.
Member can store className.
Member can store metadata.
Member can store deletedAt.
```

### Writing Evaluation

```text
New WritingRubric model exists.
New WritingEvaluation model exists.
Submission remains the original submitted content record.
New evaluation APIs do not use deprecated /api/ai/grade.
Evaluations store rubricId and rubricSnapshot.
Re-evaluation creates a new row.
Re-evaluation does not overwrite previous results.
```

### YouTube / Media

```text
Existing YouTube transcription/media extraction pipeline is preserved.
It is labeled/consolidated as 유튜브 미디어 추출.
Simple YouTube link material feature exists separately for lesson material PDF rendering.
YouTube link block provides thumbnail, title, and original link.
No QR, transcript, or summary is added to the simple YouTube link block.
```

### Chinese-Specific Blocks

```text
성조 연습 is removed.
한자 분석 is removed.
문화 비교 is removed.
HSK 텍스트 분석 remains.
영상 자막 분석 and 실생활 미디어 추출 are no longer separate visible features.
유튜브 미디어 추출 is the consolidated feature.
```

### Temporary Save

```text
임시 저장 in lesson material creation persists the lesson material content.
Reloading the page shows saved content.
Save button has loading, success, and error behavior.
Ownership is checked.
```

### Build

```text
npm run build passes.
Prisma migration runs successfully.
No dead imports remain from removed Chinese-specific blocks.
```

---

## 13. Do Not Implement

Do not implement these in this task:

```text
Student login expansion
Student dashboard expansion
Student-side assignment as MVP flow
PDF/HWP/HWPX upload
HWP/HWPX conversion
OCR
YouTube QR code
YouTube transcript for the simple link block
YouTube AI summary for the simple link block
Paid marketplace
Payment, purchase, revenue, settlement logic
```

---

## 14. Final Instruction

Preserve existing working features where possible. Refactor only where needed to align the repository with the MVP scope.

The highest-risk areas are:

```text
writing evaluation data model
temporary save persistence
Chinese-specific block cleanup
YouTube feature separation
```

Prioritize correctness, ownership checks, and build stability.
