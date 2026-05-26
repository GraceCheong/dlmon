# Next Implementation Plan

> 기준: `docs/UI_SCENARIOS.md` 시나리오 A-M과 2026-05-26 현재 코드 대조.

## 0. 구현 상태

2026-05-26 구현 반영:

- **완료**: Phase 1 링크/첨부/중복 제출, Phase 2 YouTube AI extraction nested edit/save 계약, Phase 3 lesson plan/template raw JSON 편집 제거, Phase 4 audience/list UX 정리.
- **보류**: Phase 5 Textbook feature decision gate. 데이터 출처와 저장 타깃이 정해지기 전에는 mock/503 shell을 유지한다.
- **후속 작업**: 전체 i18n 일괄 변환은 이번 구현 범위 밖이다. 새로 만진 기능에도 일부 Korean literal이 남아 있어 별도 i18n pass에서 처리한다.

## 분류 기준

- **미구현**: UI 시나리오에 필요한 사용자 흐름이 없거나, route가 mock/503/disabled 상태라 실제로 완료할 수 없는 항목.
- **모호/부분 구현**: API와 UI는 있지만 사용자가 실수하기 쉽거나, 데이터 계약이 불명확하거나, 일부 결과만 편집/표시되는 항목.
- **유지**: UI 시나리오상 명시적으로 제외된 범위. 구현 계획에 넣지 않는다.

유지 범위:

- 학생 로그인/학생 대시보드.
- 유료 마켓플레이스/결제/정산.
- 업로드 파일 OCR 또는 AI 입력화.
- 단순 YouTube 링크 블록의 transcript/AI summary/QR.

---

## 1. 미구현 항목

| 우선순위 | 시나리오 | 현재 상태 | 필요한 결과 |
|---|---|---|---|
| P2 | M. Textbook template shell | `/api/textbooks`는 mock unavailable 데이터, unit API는 빈 배열, AI generate route는 503, UI 버튼은 disabled다. | 실제 구현 전 제품 결정이 필요하다: textbook source model, unit/content schema, 권한, 생성 결과 저장 위치를 정의한다. 이후 DB/API/UI를 구현한다. |

---

## 2. 모호하거나 부분 구현된 항목

| 우선순위 | 시나리오 | 모호한 점 | 필요한 정리 |
|---|---|---|---|
| P2 | C. Public-safe file access | public file route는 "어떤 published lesson의 file block에 참조되는 fileId"이면 접근 가능하다. 현재 public lesson context와 직접 묶이지 않는다. | 필요 수준을 결정한다. fileId가 충분히 비공개라고 볼지, `/p/[slug]` context-bound token/route로 좁힐지 정한다. |
| P3 | Cross-scenario i18n | 여러 신규 기능 컴포넌트가 Korean literal을 직접 렌더링한다. 언어 토글과 일관성이 없다. | touched feature부터 `useLanguage()`와 `lib/translations.ts`로 이동한다. 전체 일괄 변경은 별도 i18n pass로 묶는다. |

---

## 3. 구현 순서

### Phase 1 - 링크/첨부 흐름 보정 (완료)

목표: 현재 사용자 흐름을 깨는 항목을 먼저 해결한다.

1. `app/(dashboard)/assignments/[id]/page.tsx`
   - 학생별 공유 링크 목록을 추가한다.
   - 링크 형식: `${publicBaseUrl}/student/assignments/${assignment.id}?memberId=${member.id}`.
   - pending/submitted 구분과 복사 상태를 표시한다.
2. `app/student/assignments/[id]/page.tsx`
   - assignment query에 `attachments.uploadedFile`을 포함한다.
   - 클라이언트 props에 safe attachment metadata를 전달한다.
3. `app/student/assignments/[id]/StudentAssignmentClient.tsx`
   - 첨부 파일 목록을 렌더링한다.
   - 다운로드/미리보기 route는 학생 링크에 적합한 public-safe route를 사용한다.
4. `app/api/ai/grade/route.ts`
   - 같은 `assignmentId + memberId` 기존 submission이 있으면 중복 생성하지 않는 정책을 정한다.
   - 권장: 이미 제출된 경우 409를 반환하고 UI에서 "이미 제출됨"을 표시한다.

검증:

- `?memberId` 없는 학생 URL은 기존처럼 거부된다.
- 교사용 상세 페이지의 학생별 링크는 바로 열렸을 때 해당 학생으로 제출 화면에 들어간다.
- 첨부 파일이 있는 과제에서 학생이 파일을 다운로드할 수 있다.
- 동일 학생이 새로고침/중복 클릭으로 submission을 여러 개 만들지 않는다.

### Phase 2 - YouTube AI extraction 결과 편집 완성 (완료)

목표: "editable result"의 의미를 실제 전체 결과 편집으로 맞춘다.

1. `components/editor/blocks/MediaImportBlock.tsx`
   - vocabulary 카드에 word/pinyin/meaning edit/delete/add를 추가한다.
   - grammarPoints 카드에 pattern/explanation edit/delete/add를 추가한다.
   - comprehensionQuestions에 question/answer edit/delete/add를 추가한다.
   - output option이 false인 섹션은 저장 결과에서도 빈 배열/숨김을 일관되게 처리한다.
2. `app/api/ai/import-media/jobs/[jobId]/save/route.ts`
   - 현재 UI에서 쓰지 않는 `saveAs` 값을 유지할지 결정한다.
   - 유지한다면 `lessonPlanId`, `materialId` 각각의 소유권 검증을 추가한다.
   - 제거한다면 `VALID_SAVE_AS`와 오류 메시지를 실제 UI 범위에 맞춘다.

검증:

- 편집한 nested vocabulary/grammar/question 값이 lesson draft save 후에도 유지된다.
- 가져오기 기록 저장 후 다시 열었을 때 편집 값이 유지된다.
- 다른 사용자의 lessonPlan/template/material id로 저장할 수 없다.

### Phase 3 - Raw JSON 편집 제거 (완료)

목표: lesson plan/template을 교사가 JSON 없이 편집하게 한다.

1. `components/dashboard/LessonPlanGeneratorClient.tsx`
   - saved plan edit textarea를 구조화된 form으로 바꾼다.
   - `sections`는 add/delete/reorder 가능한 반복 필드로 만든다.
   - JSON import/export가 필요하면 "고급" 접힘 영역에만 둔다.
2. `components/dashboard/TemplatesClient.tsx`
   - template content raw JSON textarea를 section/activity/resource 기반 form으로 바꾼다.
   - marketplace publish 전에 snapshot preview를 보여준다.
3. API는 현재 JSON string 저장 방식을 유지하되, 클라이언트에서 typed object를 만들어 PATCH한다.

검증:

- 기존 raw JSON content가 parse 가능한 경우 form으로 hydrate된다.
- parse 불가능한 legacy content는 읽기 전용 raw view와 복구 안내를 보여준다.
- 저장 후 marketplace snapshot은 이전처럼 immutable이다.

### Phase 4 - 선택자/목록 UX 정리 (완료)

목표: 여러 도구의 입력 규칙과 목록 탐색을 통일한다.

1. `components/editor/blocks/TextAnalyzerBlock.tsx`
   - target audience를 shared `AudienceSelector`로 교체한다.
   - 기존 free-text 값은 가능한 audience로 매핑하고, 매핑 불가 값은 custom fallback으로 보존한다.
2. `components/dashboard/LessonPlanGeneratorClient.tsx`
   - prompt/plan 검색을 추가한다.
   - "현재 프롬프트 복제" 버튼을 추가한다.
3. `components/dashboard/TemplatesClient.tsx`
   - template 검색/필터를 추가한다.
4. `components/dashboard/MarketplaceClient.tsx`
   - 현재 검색/필터 동작에 empty/error/loading 상태를 명확히 보강한다.

검증:

- standalone generator와 editor generator가 같은 audience 값 체계를 사용한다.
- 저장된 항목이 20개 이상이어도 prompt/plan/template을 찾을 수 있다.

### Phase 5 - Textbook feature decision gate

목표: shell을 실제 기능으로 바꾸기 전에 데이터 계약을 확정한다.

결정해야 할 것:

- Textbook source: 내장 DB, 교사별 수동 등록, 외부 API 중 무엇인지.
- Unit schema: textbook, unit, lesson, vocabulary, grammar, passage, exercise.
- Generated output target: Template, LessonPlan, LessonBlock 중 어디에 저장할지.
- 저작권/출처 표기와 교재 원문 저장 범위.

결정 후 구현:

1. Prisma model 추가.
2. `/api/textbooks`, `/api/textbooks/[textbookId]/units`를 mock에서 실제 DB로 교체.
3. `/api/ai/textbook-template/generate` 503 제거.
4. `TextbookTemplateClient`에서 unit 선택, content preview, generation result save를 구현.

검증:

- unavailable mock option이 사라지고 실제 unit을 선택할 수 있다.
- 생성 결과가 template 또는 lesson plan으로 저장된다.
- textbook source가 없는 환경에서는 명확한 setup empty state를 보여준다.

---

## 4. 이번 계획에서 제외

- 단순 YouTube link block에 transcript/summary/QR 추가.
- 업로드 PDF/HWP/HWPX 내용을 AI 입력으로 사용하는 기능.
- 학생 계정/로그인/대시보드.
- 결제형 marketplace.
- 전체 i18n 일괄 변환. 단, 위 phase에서 touched component의 신규 문구는 번역 키로 추가한다.

---

## 5. 완료 기준

- 각 phase는 `docs/UI_SCENARIOS.md`의 해당 scenario 행을 함께 갱신한다.
- 기능별로 `docs/codebase-map.md`의 Task-To-Files Map과 Known Gaps를 최신화한다.
- route/schema 변경이 있으면 `npx prisma validate`, `npx tsc --noEmit`, `npm run build`를 통과해야 한다.
- UI-only 변경은 affected route를 dev server에서 직접 열어 loading/error/empty/success 상태를 확인한다.
