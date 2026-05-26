'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  MessageSquare,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  RUBRIC_CRITERIA,
  DEFAULT_DEDUCTION_POLICY,
  getDefaultCriteriaDescription,
  getDefaultDeductionPolicy,
  type CriterionEvaluation,
  type Deduction,
  type DeductionPolicy,
  type SentenceFeedback,
} from '@/lib/writing-evaluation';

type CriteriaMap = Record<string, string>;
type DeductionPolicyMap = Record<string, number>;

interface RubricDetails {
  id: string;
  hskLevel: string;
  targetAudience: string;
  criteria: CriteriaMap;
  deductionPolicy: DeductionPolicyMap;
  createdByAi: boolean;
  version: number;
  status: string;
}

interface AssignmentSummary {
  id: string;
  title: string;
  prompt: string;
  dueDate: string | null;
  type: string;
  rubricId: string | null;
  hskLevel: string | null;
  targetAudience: string | null;
  rubric: RubricDetails | null;
}

const EXAMPLE_PROMPTS: Record<string, Array<{ label: string; prompt: string }>> = {
  HSK1: [
    { label: '자기소개', prompt: '자신의 이름, 나이, 가족을 소개하세요. 简单介绍自己的名字、年龄和家人。(3~5문장)' },
    { label: '좋아하는 것', prompt: '자신이 좋아하는 음식이나 활동을 소개하세요. 介绍你喜欢的食物或活动。(3~5문장)' },
    { label: '나의 학교', prompt: '자신의 학교나 교실을 소개하세요. 介绍你的学校或教室。(3~5문장)' },
  ],
  HSK2: [
    { label: '나의 하루', prompt: '어제 또는 오늘 하루를 어떻게 보냈는지 써 보세요. 写一写你昨天或今天是怎么过的。(5~7문장)' },
    { label: '나의 취미', prompt: '자신의 취미 활동을 소개하고, 왜 좋아하는지 써 보세요. 介绍你的爱好，并说明为什么喜欢。(5~7문장)' },
    { label: '가고 싶은 곳', prompt: '가고 싶은 여행지와 이유를 소개하세요. 介绍你想去的地方及原因。(5~7문장)' },
  ],
  HSK3: [
    { label: '건강한 생활', prompt: '건강한 생활 습관에 대해 쓰고, 자신의 생활과 비교해 보세요. 写一写健康的生活习惯，并与自己的生活进行比较。(7~10문장)' },
    { label: '기억에 남는 경험', prompt: '가장 기억에 남는 경험을 소개하고 그때의 느낌을 써 보세요. 介绍你印象最深的一次经历，写出当时的感受。(7~10문장)' },
    { label: '중국 문화', prompt: '중국의 전통 명절이나 문화 중 관심 있는 것을 소개하세요. 介绍一个你感兴趣的中国传统节日或文化。(7~10문장)' },
  ],
  HSK4: [
    { label: '스마트폰의 영향', prompt: '스마트폰이 현대인의 생활에 미치는 긍정적·부정적 영향을 분석하세요. 分析智能手机对现代人生活的利与弊。(150자 이상)' },
    { label: '환경 보호', prompt: '환경 오염의 원인과 개인이 할 수 있는 환경 보호 방법을 써 보세요. 写一写环境污染的原因以及个人能做的环保措施。(150자 이상)' },
    { label: '교육과 성공', prompt: '교육이 개인의 성공에 어떤 영향을 미치는지 자신의 견해를 써 보세요. 写出你对教育与个人成功关系的看法。(150자 이상)' },
  ],
  HSK5: [
    { label: '도시화의 영향', prompt: '도시화 과정에서 발생하는 사회적 문제와 해결 방안을 논술하세요. 论述城市化进程中产生的社会问题及解决方案。(200자 이상)' },
    { label: '전통과 현대', prompt: '전통문화 보호와 현대화 사이의 균형에 대해 자신의 견해를 논술하세요. 就传统文化保护与现代化之间的平衡发表你的看法。(200자 이상)' },
    { label: '미디어 리터러시', prompt: '소셜 미디어가 현대 사회의 여론 형성에 미치는 영향을 분석하고, 미디어 리터러시의 중요성을 논하세요. 分析社交媒体对舆论形成的影响，并论述媒体素养的重要性。(200자 이상)' },
  ],
  HSK6: [
    { label: '인공지능과 미래', prompt: '인공지능 기술의 발전이 노동시장과 교육에 미치는 영향을 다각도로 논술하고, 미래 사회가 어떻게 대응해야 할지 제언하세요. 论述人工智能对劳动力市场和教育的多方面影响，并就未来社会的应对方式提出建议。(300자 이상)' },
    { label: '문화 다양성', prompt: '세계화 속에서 문화 다양성을 보호하는 것의 의의와 구체적 방안을 논증하세요. 论证在全球化背景下保护文化多样性的意义及具体方案。(300자 이상)' },
    { label: '지속 가능한 발전', prompt: '경제 성장과 환경 보호의 균형을 어떻게 실현할 것인지 구체적인 사례와 함께 논술하세요. 结合具体案例，论述如何实现经济增长与环境保护的平衡发展。(300자 이상)' },
  ],
};

interface SubmissionSummary {
  id: string;
  memberId: string;
  memberName: string;
  contentText: string | null;
  aiScore: number | null;
  aiFeedback: string | null;
  createdAt: string;
  evaluations: EvaluationSummary[];
}

interface EvaluationSummary {
  id: string;
  score100: number;
  score10: number;
  overallSummary: string;
  teacherComment: string | null;
  criterionResults?: CriterionEvaluation[];
  deductions: Deduction[];
  sentenceFeedback: SentenceFeedback[];
  rubricSnapshot: Record<string, unknown> | null;
  evaluationVersion: number;
  createdAt: string;
}

interface MemberOption {
  id: string;
  name: string;
  className: string | null;
}

// HSK-calibrated samples: vocabulary and grammar structures match each level's word list.
const DEBUG_SAMPLES: Record<string, string[]> = {
  // HSK1 (~150 words): simple SVO, 是/有/在, no subordinate clauses
  HSK1: [
    '我是学生。我叫王明。我今年十八岁。我有一个哥哥。他很高，也很帅。',
    '今天天气好。我很高兴。我和朋友去吃饭了。我们吃了米饭和鱼。饭很好吃。',
  ],
  // HSK2 (~300 words): 了/过/想/要, simple time words, 因为, basic comparison
  HSK2: [
    '昨天我去书店了。我买了一本书。那本书很有意思，我很喜欢。我想每天看一个小时。',
    '我喜欢游泳。游泳很好玩，也对身体好。我每个星期去游泳两次。我想学得更好。',
  ],
  // HSK3 (~600 words): 虽然…但是, 因为…所以, 一边…一边, 越来越, basic opinion
  HSK3: [
    '我喜欢运动，因为运动对身体很好。虽然每天很忙，但是我还是要锻炼。我每天早上跑步三十分钟，感觉很好。',
    '我的爱好是看书。我每个星期看两本书。我觉得看书可以学到很多东西，所以我一直坚持这个习惯。',
  ],
  // HSK4 (~1200 words): complex clauses, opinion + reason + example, abstract nouns begin
  HSK4: [
    '随着生活水平的提高，越来越多的人开始注重健康。我认为合理的饮食和适当的运动是保持健康的关键。虽然现代人生活节奏很快，但是还是应该抽出时间关注身体。',
    '网络给我们的生活带来了很多方便，但是也有一些问题。比如，有些人花太多时间在手机上，影响了学习和工作。我觉得我们应该合理使用网络。',
  ],
  // HSK5 (~2500 words): multi-paragraph argument, discourse markers, abstract topics
  HSK5: [
    '网络技术的发展改变了人们获取信息的方式。如今各种平台让信息传播更加迅速，但同时也带来了虚假信息的问题。如何甄别真假信息，成为现代人必须具备的能力。我认为，媒体素养教育应当纳入学校课程。',
    '城市化进程加快，越来越多的人涌入大城市寻求发展机会。这一现象带来了经济的繁荣，同时也造成了交通拥堵、房价上涨等问题。如何在发展经济的同时保持良好的居住环境，是许多国家共同面临的挑战。',
  ],
  // HSK6 (~5000 words): near-native, nuanced argument, cohesive discourse
  HSK6: [
    '在全球化背景下，文化多样性的保护面临前所未有的挑战。强势文化的传播往往在无形中侵蚀着地方文化，而数字技术的普及也为文化遗产的记录提供了新的可能。如何在推动文化交流的同时妥善保护各民族的文化根脉，需要政府、学界与民间社会的共同努力。',
    '人工智能技术的迅猛发展正在重塑劳动力市场的格局。部分重复性工作将被自动化替代，但同时也会催生新的职业需求。面对这一趋势，教育体系亟需转型，着重培养批判性思维与创造力，而非单纯的技能训练，以使学生具备应对未来不确定性的能力。',
  ],
};

function getDebugSample(hskLevel: string): string {
  const key = hskLevel.trim().toUpperCase().replace(/\s+/g, '');
  const samples = DEBUG_SAMPLES[key] ?? DEBUG_SAMPLES['HSK3'] ?? [];
  return samples[Math.floor(Math.random() * samples.length)] ?? '';
}

function buildCriterionResultsFromDeductions(
  deductions: Deduction[],
  rubricSnapshot: Record<string, unknown> | null,
): CriterionEvaluation[] {
  const policy = (rubricSnapshot?.deductionPolicy as DeductionPolicy | undefined) ?? DEFAULT_DEDUCTION_POLICY;
  return RUBRIC_CRITERIA.map((criterion) => {
    const maxDeduction = policy[criterion] ?? DEFAULT_DEDUCTION_POLICY[criterion];
    const cd = deductions.filter((d) => d.criterion === criterion);
    const deduction = cd.reduce((sum, d) => sum + d.amount, 0);
    return {
      criterion,
      maxDeduction,
      deduction,
      score: Math.max(0, maxDeduction - deduction),
      evidence: cd.length > 0 ? '감점 항목 존재' : '-',
      explanation: cd.map((d) => d.reason).filter(Boolean).join(' / ') || '이 기준에서 감점 없음',
    };
  });
}

const CRITERION_LABELS: Record<string, string> = {
  grammar: '문법',
  vocabulary: '어휘',
  sentence_structure: '문장 구조',
  logical_coherence: '논리 흐름',
  task_relevance: '과제 부합도',
  naturalness: '자연스러움',
};

const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];

const labelStyle: { display: string; fontSize: string; fontWeight: number; color: string; marginBottom: string } = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#4A5568',
  marginBottom: '0.35rem',
};
const TEACHER_TEST_MEMBER_VALUE = '__rubric_preview__';
const TEACHER_TEST_MEMBER_NAME = '루브릭 평가';

function normalizeRubric(raw: RubricDetails): RubricDetails {
  return {
    ...raw,
    criteria: raw.criteria || {},
    deductionPolicy: raw.deductionPolicy || {},
  };
}

function criterionLabel(key: string) {
  return CRITERION_LABELS[key] || key;
}

function isAbortError(err: unknown) {
  return err instanceof Error && err.name === 'AbortError';
}

export default function AssignmentDetailClient({
  assignment,
  initialSubmissions,
  pendingMemberCount,
}: {
  assignment: AssignmentSummary;
  initialSubmissions: SubmissionSummary[];
  members: MemberOption[];
  pendingMemberCount: number;
}) {
  const router = useRouter();
  const rubricAbortRef = useRef<AbortController | null>(null);
  const [rubricId, setRubricId] = useState(assignment.rubricId);
  const [rubric, setRubric] = useState<RubricDetails | null>(assignment.rubric);
  const [hskLevel, setHskLevel] = useState(assignment.hskLevel || assignment.rubric?.hskLevel || 'HSK3');
  const [targetAudience, setTargetAudience] = useState(assignment.targetAudience || assignment.rubric?.targetAudience || '중국어 학습자');
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [contentText, setContentText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCriteria, setManualCriteria] = useState<CriteriaMap>(rubric?.criteria || getDefaultCriteriaDescription(hskLevel));
  const [manualPolicy, setManualPolicy] = useState<DeductionPolicyMap>(rubric?.deductionPolicy || getDefaultDeductionPolicy(hskLevel));
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [teacherTestResult, setTeacherTestResult] = useState<SubmissionSummary | null>(null);

  // Assignment edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(assignment.title);
  const [editPrompt, setEditPrompt] = useState(assignment.prompt);
  const [editHskLevel, setEditHskLevel] = useState(assignment.hskLevel || 'HSK3');
  const [editTargetAudience, setEditTargetAudience] = useState(assignment.targetAudience || '중국어 학습자');
  const [editDueDate, setEditDueDate] = useState(assignment.dueDate ? assignment.dueDate.slice(0, 10) : '');
  const [editType, setEditType] = useState(assignment.type);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const submittedCount = submissions.length;
  const isWriting = assignment.type === 'writing';
  const policyTotal = useMemo(
    () => Object.values(manualPolicy).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
    [manualPolicy],
  );

  const criterionKeys = useMemo(() => {
    return Array.from(new Set([...RUBRIC_CRITERIA, ...Object.keys(manualCriteria), ...Object.keys(manualPolicy)]));
  }, [manualCriteria, manualPolicy]);

  const handleEditSave = async () => {
    if (!editTitle.trim() || !editPrompt.trim()) {
      setEditError('과제명과 지시문은 필수입니다.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          prompt: editPrompt.trim(),
          hskLevel: editHskLevel,
          targetAudience: editTargetAudience,
          dueDate: editDueDate || null,
          type: editType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || '저장에 실패했습니다.');
        return;
      }
      setEditOpen(false);
      setHskLevel(editHskLevel);
      setTargetAudience(editTargetAudience);
      router.refresh();
    } catch {
      setEditError('네트워크 오류로 저장에 실패했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAutoGenerate = async () => {
    setAutoGenerating(true);
    setEditError(null);
    try {
      const res = await fetch('/api/ai/assignments/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment.id,
          hskLevel: editHskLevel,
          targetAudience: editTargetAudience,
          type: editType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError(data.error || '자동 생성에 실패했습니다.');
        return;
      }
      if (data.title) setEditTitle(data.title);
      if (data.prompt) setEditPrompt(data.prompt);
    } catch {
      setEditError('자동 생성 중 오류가 발생했습니다.');
    } finally {
      setAutoGenerating(false);
    }
  };

  const applyRubric = (next: RubricDetails) => {
    const normalized = normalizeRubric(next);
    setRubric(normalized);
    setRubricId(normalized.id);
    setHskLevel(normalized.hskLevel);
    setTargetAudience(normalized.targetAudience);
    setManualCriteria(normalized.criteria);
    setManualPolicy(normalized.deductionPolicy);
  };

  const confirmRubricReplace = (actionLabel: string) => {
    if (!rubricId) return true;
    return window.confirm(
      `이미 연결된 루브릭이 있습니다. 기존 루브릭을 교체하고 ${actionLabel}할까요?\n\n기존 평가 기록은 유지되지만, 이 과제의 이후 평가는 새 루브릭을 기준으로 진행됩니다.`,
    );
  };

  useEffect(() => {
    return () => {
      rubricAbortRef.current?.abort();
    };
  }, []);

  const saveRubric = async (
    manualRubric?: { criteria: CriteriaMap; deductionPolicy: DeductionPolicyMap },
    options?: { signal?: AbortSignal },
  ) => {
    const res = await fetch('/api/ai/writing-rubrics/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options?.signal,
      body: JSON.stringify({
        assignmentId: assignment.id,
        hskLevel,
        targetAudience,
        manualRubric,
        replaceAssignmentRubric: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || '루브릭 저장에 실패했습니다.');
    }
    applyRubric(data.rubric as RubricDetails);
    router.refresh();
    return data.rubric.id as string;
  };

  const cancelRubricGeneration = () => {
    const controller = rubricAbortRef.current;
    if (!controller) return;
    controller.abort();
    rubricAbortRef.current = null;
    setError('루브릭 생성을 취소했습니다.');
    setBusy((current) => (current === 'rubric' ? null : current));
  };

  const generateRubric = async () => {
    if (!confirmRubricReplace('새 루브릭을 생성')) return null;
    const controller = new AbortController();
    rubricAbortRef.current = controller;
    setBusy('rubric');
    setError(null);
    try {
      return await saveRubric(undefined, { signal: controller.signal });
    } catch (err) {
      if (isAbortError(err)) {
        setError('루브릭 생성을 취소했습니다.');
      } else {
        setError(err instanceof Error ? err.message : '루브릭 생성에 실패했습니다.');
      }
      return null;
    } finally {
      if (rubricAbortRef.current === controller) {
        rubricAbortRef.current = null;
        setBusy((current) => (current === 'rubric' ? null : current));
      }
    }
  };

  const openManualEditor = () => {
    setManualCriteria(rubric?.criteria || getDefaultCriteriaDescription(hskLevel));
    setManualPolicy(rubric?.deductionPolicy || getDefaultDeductionPolicy(hskLevel));
    setManualOpen(true);
  };

  const saveManualRubric = async () => {
    if (policyTotal !== 100) {
      setError(`감점 배점 합계는 100이어야 합니다. 현재 ${policyTotal}입니다.`);
      return;
    }
    if (!confirmRubricReplace('편집한 루브릭으로 저장')) return;
    setBusy('manual-rubric');
    setError(null);
    try {
      await saveRubric({ criteria: manualCriteria, deductionPolicy: manualPolicy });
      setManualOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수동 루브릭 저장에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const evaluateTeacherTest = async (activeRubricId: string) => {
    const res = await fetch('/api/ai/writing-evaluations/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId: assignment.id,
        rubricId: activeRubricId,
        contentText,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.detail || 'AI 평가에 실패했습니다.');
    return data.evaluation as EvaluationSummary;
  };

  const handleCreateAndEvaluate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contentText.trim()) {
      setError('AI 평가를 진행할 학생 작문 내용을 입력하세요.');
      return;
    }

    setBusy('submit');
    setError(null);
    try {
      let activeRubricId = rubricId;
      if (isWriting && !activeRubricId) {
        activeRubricId = await saveRubric();
      }
      if (isWriting && !activeRubricId) return;
      const resolvedRubricId = activeRubricId;
      if (!resolvedRubricId) return;

      const evaluation = await evaluateTeacherTest(resolvedRubricId);
      setTeacherTestResult({
        id: `teacher-test-${Date.now()}`,
        memberId: TEACHER_TEST_MEMBER_VALUE,
        memberName: TEACHER_TEST_MEMBER_NAME,
        contentText,
        aiScore: Math.round(evaluation.score100),
        aiFeedback: evaluation.overallSummary,
        createdAt: new Date().toISOString(),
        evaluations: [evaluation],
      });
      setContentText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '평가 중 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const handleReevaluate = async (evaluationId: string) => {
    setBusy(`reevaluate:${evaluationId}`);
    setError(null);
    try {
      const res = await fetch(`/api/writing-evaluations/${evaluationId}/reevaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || data.detail || '재평가에 실패했습니다.');
        return;
      }
      const evaluation = data.evaluation as EvaluationSummary;
      setSubmissions((prev) => prev.map((submission) => {
        if (!submission.evaluations.some((item) => item.id === evaluationId)) return submission;
        return {
          ...submission,
          aiScore: Math.round(evaluation.score100),
          aiFeedback: evaluation.overallSummary,
          evaluations: [evaluation, ...submission.evaluations],
        };
      }));
      router.refresh();
    } catch {
      setError('재평가 중 네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const saveTeacherComment = async (evaluationId: string) => {
    setBusy(`comment:${evaluationId}`);
    setError(null);
    const teacherComment = commentDrafts[evaluationId] ?? '';
    try {
      const res = await fetch(`/api/writing-evaluations/${evaluationId}/comment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherComment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || '교사 코멘트 저장에 실패했습니다.');
        return;
      }
      setSubmissions((prev) => prev.map((submission) => ({
        ...submission,
        evaluations: submission.evaluations.map((evaluation) => (
          evaluation.id === evaluationId ? { ...evaluation, teacherComment: data.evaluation.teacherComment } : evaluation
        )),
      })));
    } catch {
      setError('교사 코멘트 저장 중 네트워크 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Assignment edit panel ──────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editOpen ? '1.25rem' : 0 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2D3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pencil size={16} /> 과제 수정
          </h2>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            onClick={() => { setEditOpen((v) => !v); setEditError(null); }}
          >
            {editOpen ? <><ChevronUp size={15} /> 접기</> : <><ChevronDown size={15} /> 펼치기</>}
          </button>
        </div>

        {editOpen && (
          <div>
            {/* Row 1: title / type / dueDate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 160px', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>과제명 *</label>
                <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="과제 제목" />
              </div>
              <div>
                <label style={labelStyle}>유형</label>
                <select className="input" value={editType} onChange={(e) => setEditType(e.target.value)}>
                  <option value="writing">작문</option>
                  <option value="speaking">말하기</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>마감일</label>
                <input className="input" type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
            </div>

            {/* Row 2: HSK level / target audience */}
            {editType === 'writing' && (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={labelStyle}>HSK 수준</label>
                  <select className="input" value={editHskLevel} onChange={(e) => { setEditHskLevel(e.target.value); setShowExamples(false); }}>
                    {HSK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>평가 대상</label>
                  <input className="input" value={editTargetAudience} onChange={(e) => setEditTargetAudience(e.target.value)} placeholder="중국어 학습자" />
                </div>
              </div>
            )}

            {/* Prompt textarea */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={labelStyle}>과제 지시문 *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {editType === 'writing' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => setShowExamples((v) => !v)}
                    >
                      {showExamples ? '예시 닫기' : '예시 보기'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    onClick={handleAutoGenerate}
                    disabled={autoGenerating}
                  >
                    {autoGenerating ? <><Loader2 size={13} className="spin" /> 생성 중...</> : <><Sparkles size={13} /> 과제 자동생성</>}
                  </button>
                </div>
              </div>

              {/* Example prompts accordion */}
              {showExamples && EXAMPLE_PROMPTS[editHskLevel] && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '0.5rem', fontWeight: 600 }}>{editHskLevel} 예시 과제 지시문 (클릭하면 채워집니다)</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {EXAMPLE_PROMPTS[editHskLevel].map((ex) => (
                      <button
                        key={ex.label}
                        type="button"
                        onClick={() => { setEditPrompt(ex.prompt); setShowExamples(false); }}
                        style={{
                          textAlign: 'left', background: 'white', border: '1px solid #E2E8F0',
                          borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', cursor: 'pointer',
                          fontSize: '0.82rem', color: '#4A5568', lineHeight: 1.5,
                        }}
                      >
                        <strong style={{ color: 'var(--primary)' }}>[{ex.label}]</strong> {ex.prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                className="input"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="학생에게 보일 과제 지시문을 입력하세요."
                style={{ minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            {editError && (
              <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setEditOpen(false)} disabled={editSaving}>취소</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving || !editTitle.trim() || !editPrompt.trim()}>
                {editSaving ? <><Loader2 size={15} className="spin" /> 저장 중...</> : <><Save size={15} /> 변경 저장</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {isWriting && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2D3748', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={18} /> 작문 평가 루브릭
              </h2>
              <p style={{ color: '#718096', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {rubric ? `현재 루브릭: ${rubric.hskLevel}, ${rubric.targetAudience}` : '루브릭이 없으면 평가 전 자동 생성됩니다.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={openManualEditor} disabled={busy !== null}>
                편집
              </button>
              <button
                className="btn btn-secondary"
                onClick={busy === 'rubric' ? cancelRubricGeneration : generateRubric}
                disabled={busy !== null && busy !== 'rubric'}
              >
                {busy === 'rubric' ? <><X size={16} /> 생성 취소</> : <><Sparkles size={16} /> AI 생성/교체</>}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <select className="input" value={hskLevel} onChange={(e) => setHskLevel(e.target.value)}>
              {HSK_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
            <input className="input" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
          </div>

          {rubric ? (
            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {Object.keys(rubric.criteria).map((key) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 80px', gap: '0.75rem', alignItems: 'start', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 800, color: '#2D3748' }}>{criterionLabel(key)}</div>
                  <div style={{ color: '#4A5568', lineHeight: 1.5 }}>{rubric.criteria[key]}</div>
                  <div style={{ textAlign: 'right', color: '#991B1B', fontWeight: 800 }}>{rubric.deductionPolicy[key] ?? 0}점</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E0', borderRadius: 'var(--radius-md)', padding: '1rem', color: '#718096' }}>
              아직 연결된 루브릭이 없습니다. AI 생성 또는 수동 편집으로 루브릭을 먼저 저장할 수 있습니다.
            </div>
          )}

          {manualOpen && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#2D3748' }}>루브릭 편집</h3>
                <span style={{ color: policyTotal === 100 ? '#166534' : '#991B1B', fontWeight: 800, fontSize: '0.85rem' }}>
                  배점 합계 {policyTotal}
                </span>
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {criterionKeys.map((key) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 110px', gap: '0.75rem', alignItems: 'start' }}>
                    <label style={{ fontWeight: 800, color: '#4A5568', paddingTop: '0.65rem' }}>{criterionLabel(key)}</label>
                    <textarea
                      className="input"
                      value={manualCriteria[key] || ''}
                      onChange={(e) => setManualCriteria((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{ minHeight: '72px', resize: 'vertical' }}
                    />
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={100}
                      value={manualPolicy[key] ?? 0}
                      onChange={(e) => setManualPolicy((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setManualOpen(false)} disabled={busy !== null}>취소</button>
                <button className="btn btn-primary" onClick={saveManualRubric} disabled={busy !== null || policyTotal !== 100}>
                  {busy === 'manual-rubric' ? <><Loader2 size={16} className="spin" /> 저장 중...</> : <><Save size={16} /> 저장</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isWriting && (
        <form onSubmit={handleCreateAndEvaluate} className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2D3748', marginBottom: '1rem' }}>루브릭 기반 작문 평가</h2>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <textarea
                className="input"
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="학생의 중국어 작문을 입력하세요."
                style={{ minHeight: '120px', resize: 'vertical', paddingRight: '3rem' }}
              />
              {contentText && (
                <button
                  type="button"
                  onClick={() => setContentText('')}
                  aria-label="작문 내용 지우기"
                  title="작문 내용 지우기"
                  style={{
                    position: 'absolute',
                    top: '0.7rem',
                    right: '0.75rem',
                    width: '30px',
                    height: '30px',
                    borderRadius: '999px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#A0AEC0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.85rem', background: '#FFF7ED', border: '1px dashed #F97316', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#9A3412', fontWeight: 800, flexShrink: 0 }}>Dev</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setContentText(getDebugSample(hskLevel))}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              >
                샘플 작문 채우기 ({hskLevel})
              </button>
            </div>
          )}
          {error && <div style={{ color: '#991B1B', background: '#FEF2F2', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={busy !== null}>
            {busy === 'submit'
              ? <><Loader2 size={16} className="spin" /> 평가 중...</>
              : busy !== null
                ? <><Loader2 size={16} className="spin" /> 다른 작업 진행 중...</>
                : <><CheckCircle size={16} /> 루브릭 기반 AI 평가</>}
          </button>
        </form>
      )}

      {teacherTestResult && teacherTestResult.evaluations[0] && (
        <div className="card" style={{ padding: '1.5rem', border: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E3A8A' }}>교사 테스트 평가 결과</h2>
              <p style={{ color: '#718096', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                저장되지 않는 임시 평가입니다. {new Date(teacherTestResult.createdAt).toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTeacherTestResult(null)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <X size={14} /> 닫기
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <div style={{ background: '#F0FDF4', color: '#166534', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 800 }}>
              AI 점수: {teacherTestResult.evaluations[0].score100} / 100 ({teacherTestResult.evaluations[0].score10} / 10)
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>테스트 작문</h4>
              <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#4A5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {teacherTestResult.contentText}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>AI 총평</h4>
              <div style={{ background: '#FEF2F2', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#991B1B', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {teacherTestResult.evaluations[0].overallSummary || '평가 결과 요약이 없습니다.'}
              </div>
            </div>
          </div>
          {(teacherTestResult.evaluations[0].criterionResults?.length ?? 0) > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>루브릭 기준별 채점 근거</h4>
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {teacherTestResult.evaluations[0].criterionResults?.map((criterionResult) => (
                  <div
                    key={criterionResult.criterion}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 130px minmax(0, 1fr)',
                      gap: '0.75rem',
                      alignItems: 'start',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      color: '#4A5568',
                    }}
                  >
                    <strong style={{ color: '#2D3748' }}>{criterionLabel(criterionResult.criterion)}</strong>
                    <span style={{ color: criterionResult.deduction > 0 ? '#991B1B' : '#166534', fontWeight: 800 }}>
                      {criterionResult.score}/{criterionResult.maxDeduction}점
                      {criterionResult.deduction > 0 ? ` (-${criterionResult.deduction})` : ''}
                    </span>
                    <div style={{ display: 'grid', gap: '0.35rem', lineHeight: 1.55 }}>
                      <div>
                        <span style={{ color: '#718096', fontWeight: 800 }}>근거: </span>
                        {criterionResult.evidence}
                      </div>
                      <div>
                        <span style={{ color: '#718096', fontWeight: 800 }}>판정: </span>
                        {criterionResult.explanation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {teacherTestResult.evaluations[0].deductions.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>감점 상세</h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {teacherTestResult.evaluations[0].deductions.map((deduction, index) => (
                  <div key={`${deduction.criterion}-${index}`} style={{ display: 'grid', gridTemplateColumns: '120px 70px 1fr', gap: '0.75rem', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem', color: '#7C2D12' }}>
                    <strong>{criterionLabel(deduction.criterion)}</strong>
                    <span>-{deduction.amount}점</span>
                    <span>{deduction.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {teacherTestResult.evaluations[0].sentenceFeedback.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>문장별 피드백</h4>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {teacherTestResult.evaluations[0].sentenceFeedback.map((feedback, index) => (
                  <div key={index} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.75rem', color: '#4A5568' }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.35rem' }}>{feedback.sentence}</div>
                    {feedback.issues.length > 0 && <div style={{ color: '#991B1B', fontSize: '0.86rem' }}>{feedback.issues.join(', ')}</div>}
                    {feedback.suggestion && <div style={{ color: '#166534', marginTop: '0.3rem', fontSize: '0.86rem' }}>수정 제안: {feedback.suggestion}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2D3748', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} /> 학생 제출 현황
        </h2>
        <div style={{ color: '#718096', marginBottom: '1rem', fontSize: '0.9rem' }}>
          제출 완료 {submittedCount}명 / 미제출 {pendingMemberCount}명
        </div>

        {submissions.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#A0AEC0' }}>
            <p>아직 제출된 과제가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {submissions.map((submission) => {
              const latest = submission.evaluations[0];
              const commentValue = latest ? (commentDrafts[latest.id] ?? latest.teacherComment ?? '') : '';
              return (
                <div key={submission.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#2D3748' }}>{submission.memberName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#718096' }}>{new Date(submission.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ background: '#F0FDF4', color: '#166534', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                        AI 점수: {latest ? `${latest.score100} / 100 (${latest.score10} / 10)` : `${submission.aiScore ?? '-'} / 100`}
                      </div>
                      {latest && (
                        <button className="btn btn-secondary" onClick={() => handleReevaluate(latest.id)} disabled={busy !== null} style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}>
                          {busy === `reevaluate:${latest.id}` ? <><Loader2 size={14} className="spin" /> 재평가 중...</> : <><RefreshCw size={14} /> 재평가</>}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>제출 내용</h4>
                      <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#4A5568', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {submission.contentText}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#718096', marginBottom: '0.5rem' }}>AI 총평</h4>
                      <div style={{ background: '#FEF2F2', padding: '1rem', borderRadius: 'var(--radius-md)', color: '#991B1B', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                        {latest?.overallSummary || submission.aiFeedback || '아직 평가 결과가 없습니다.'}
                      </div>
                      {submission.evaluations.length > 1 && (
                        <div style={{ marginTop: '0.75rem', color: '#718096', fontSize: '0.8rem' }}>
                          평가 이력 {submission.evaluations.length}개, 최신 v{submission.evaluations[0].evaluationVersion}
                        </div>
                      )}
                    </div>
                  </div>

                  {latest && (
                    <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                      {(() => {
                        const results = latest.criterionResults?.length
                          ? latest.criterionResults
                          : buildCriterionResultsFromDeductions(latest.deductions, latest.rubricSnapshot);
                        return (
                          <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>루브릭 기준별 채점 근거</h4>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                              {results.map((r) => (
                                <div
                                  key={r.criterion}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '110px 120px minmax(0, 1fr)',
                                    gap: '0.65rem',
                                    alignItems: 'start',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '0.65rem 0.75rem',
                                  }}
                                >
                                  <strong style={{ color: '#2D3748', fontSize: '0.85rem' }}>{criterionLabel(r.criterion)}</strong>
                                  <span style={{ color: r.deduction > 0 ? '#991B1B' : '#166534', fontWeight: 800, fontSize: '0.85rem' }}>
                                    {r.score}/{r.maxDeduction}점
                                    {r.deduction > 0 ? ` (-${r.deduction})` : ''}
                                  </span>
                                  <div style={{ fontSize: '0.82rem', color: '#4A5568', lineHeight: 1.5 }}>
                                    {r.explanation}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {latest.deductions.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>감점 상세</h4>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {latest.deductions.map((deduction, index) => (
                              <div key={`${deduction.criterion}-${index}`} style={{ display: 'grid', gridTemplateColumns: '120px 70px 1fr', gap: '0.75rem', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.75rem', color: '#7C2D12' }}>
                                <strong>{criterionLabel(deduction.criterion)}</strong>
                                <span>-{deduction.amount}점</span>
                                <span>{deduction.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {latest.sentenceFeedback.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem' }}>문장별 피드백</h4>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {latest.sentenceFeedback.map((feedback, index) => (
                              <div key={index} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-md)', padding: '0.75rem', color: '#4A5568' }}>
                                <div style={{ fontWeight: 800, marginBottom: '0.35rem' }}>{feedback.sentence}</div>
                                {feedback.issues.length > 0 && <div style={{ color: '#991B1B', fontSize: '0.86rem' }}>{feedback.issues.join(', ')}</div>}
                                {feedback.suggestion && <div style={{ color: '#166534', marginTop: '0.3rem', fontSize: '0.86rem' }}>수정 제안: {feedback.suggestion}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4A5568', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <MessageSquare size={16} /> 교사 코멘트
                        </h4>
                        <textarea
                          className="input"
                          value={commentValue}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [latest.id]: e.target.value }))}
                          placeholder="학생에게 전달할 교사 코멘트를 입력하세요."
                          style={{ minHeight: '90px', resize: 'vertical', marginBottom: '0.6rem' }}
                        />
                        <button className="btn btn-secondary" onClick={() => saveTeacherComment(latest.id)} disabled={busy !== null} style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}>
                          {busy === `comment:${latest.id}` ? <><Loader2 size={14} className="spin" /> 저장 중...</> : <><Save size={14} /> 코멘트 저장</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
