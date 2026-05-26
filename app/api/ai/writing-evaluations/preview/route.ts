import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cleanAiJsonResponse, getAiErrorMessage, isAiTimeoutError, writingAiTimeoutMs } from '@/lib/ai/client';
import { generateAiText } from '@/lib/ai/generate';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import {
  buildEvaluationPrompt,
  normalizeEvaluationResult,
  safeParseJson,
  type DeductionPolicy,
  getDefaultDeductionPolicy,
} from '@/lib/writing-evaluation';

interface PreviewEvaluateBody {
  assignmentId?: string;
  rubricId?: string;
  contentText?: string;
}

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: PreviewEvaluateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.assignmentId || !body.rubricId || !body.contentText?.trim()) {
    return NextResponse.json(
      { error: '`assignmentId`, `rubricId`, and non-empty `contentText` are required' },
      { status: 400 },
    );
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: body.assignmentId },
    include: { lesson: { include: { course: { select: { userId: true } } } } },
  });
  if (!assignment || assignment.lesson.course.userId !== userId) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const rubric = await prisma.writingRubric.findUnique({ where: { id: body.rubricId } });
  if (!rubric || rubric.ownerId !== userId) {
    return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
  }

  const criteriaDescription = safeParseJson<Record<string, string>>(rubric.criteria) ?? {};
  const deductionPolicy =
    safeParseJson<DeductionPolicy>(rubric.deductionPolicy) ?? getDefaultDeductionPolicy(rubric.hskLevel);
  const rubricSnapshot = {
    id: rubric.id,
    hskLevel: rubric.hskLevel,
    targetAudience: rubric.targetAudience,
    criteria: criteriaDescription,
    deductionPolicy,
    version: rubric.version,
    createdAt: rubric.createdAt.toISOString(),
  };

  const prompt = buildEvaluationPrompt({
    submissionText: body.contentText,
    assignmentPrompt: assignment.prompt,
    hskLevel: rubric.hskLevel,
    targetAudience: rubric.targetAudience,
    criteriaDescription,
    deductionPolicy,
  });

  let aiRaw: unknown = null;
  try {
    const text = await generateAiText({ prompt, userId, timeoutMs: writingAiTimeoutMs });
    aiRaw = JSON.parse(cleanAiJsonResponse(text));
  } catch (e) {
    console.warn(`Preview writing evaluation failed: ${getAiErrorMessage(e)}`);
    if (isAiTimeoutError(e)) {
      return NextResponse.json(
        { error: 'AI evaluation timed out', detail: `Local LLM did not respond within ${writingAiTimeoutMs}ms.` },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: 'AI evaluation failed', detail: getAiErrorMessage(e) },
      { status: 502 },
    );
  }

  const result = normalizeEvaluationResult(aiRaw, deductionPolicy);

  return NextResponse.json({
    evaluation: {
      id: `preview-${Date.now()}`,
      score100: result.score100,
      score10: result.score10,
      overallSummary: result.overallSummary,
      teacherComment: null,
      criterionResults: result.criterionResults,
      deductions: result.deductions,
      sentenceFeedback: result.sentenceFeedback,
      rubricSnapshot,
      evaluationVersion: 1,
      createdAt: new Date().toISOString(),
    },
  });
}
