import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateText } from 'ai';
import { aiClient, defaultModel } from '@/lib/ai/client';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import {
  buildEvaluationPrompt,
  normalizeEvaluationResult,
  DeductionPolicy,
  DEFAULT_DEDUCTION_POLICY,
} from '@/lib/writing-evaluation';

/**
 * POST /api/writing-evaluations/[evaluationId]/reevaluate
 *
 * Creates a new WritingEvaluation row whose `previousEvaluationId` points at
 * the given evaluation, and `evaluationVersion` is incremented. Re-uses the
 * previous rubricSnapshot by default so historical scoring stays comparable.
 *
 * Optional body:
 *   `{ "useCurrentRubric": true }`  — load the rubric's current state instead
 *   of the previous snapshot. Useful when the teacher has updated the rubric
 *   and wants the new evaluation to reflect that.
 *
 * NEVER overwrites the previous evaluation row.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ evaluationId: string }> },
) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;
  const { evaluationId } = await params;

  const previous = await prisma.writingEvaluation.findUnique({
    where: { id: evaluationId },
    include: {
      submission: {
        include: {
          assignment: true,
          member: true,
        },
      },
      rubric: true,
    },
  });
  if (!previous || previous.teacherId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: { useCurrentRubric?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body OK.
  }
  const useCurrent = body.useCurrentRubric === true;

  if (!previous.submission.contentText?.trim()) {
    return NextResponse.json({ error: 'Submission has no writing content' }, { status: 400 });
  }

  // Decide which rubric content to use for the new evaluation.
  let criteriaDescription: Record<string, string>;
  let deductionPolicy: DeductionPolicy;
  let rubricSnapshot: unknown;
  let rubricSource: string;

  if (useCurrent) {
    criteriaDescription = safeParse<Record<string, string>>(previous.rubric.criteria) ?? {};
    deductionPolicy = safeParse<DeductionPolicy>(previous.rubric.deductionPolicy) ?? DEFAULT_DEDUCTION_POLICY;
    rubricSnapshot = {
      id: previous.rubric.id,
      hskLevel: previous.rubric.hskLevel,
      targetAudience: previous.rubric.targetAudience,
      criteria: criteriaDescription,
      deductionPolicy,
      version: previous.rubric.version,
      capturedAt: new Date().toISOString(),
    };
    rubricSource = 'ai-regen';
  } else {
    const snap = safeParse<{
      criteria?: Record<string, string>;
      deductionPolicy?: DeductionPolicy;
    }>(previous.rubricSnapshot);
    criteriaDescription = snap?.criteria ?? {};
    deductionPolicy = snap?.deductionPolicy ?? DEFAULT_DEDUCTION_POLICY;
    rubricSnapshot = snap; // re-store the original snapshot
    rubricSource = previous.rubricSource || 'default';
  }

  // Call the AI.
  const prompt = buildEvaluationPrompt({
    submissionText: previous.submission.contentText,
    assignmentPrompt: previous.submission.assignment.prompt,
    hskLevel: previous.rubric.hskLevel,
    targetAudience: previous.rubric.targetAudience,
    criteriaDescription,
    deductionPolicy,
  });

  let aiRaw: unknown = null;
  try {
    const { text } = await generateText({
      model: aiClient(defaultModel),
      prompt,
    });
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    aiRaw = JSON.parse(cleaned);
  } catch (e) {
    console.error('Re-evaluation AI call failed:', e);
    return NextResponse.json(
      { error: 'AI evaluation failed', detail: (e as Error).message },
      { status: 502 },
    );
  }

  const result = normalizeEvaluationResult(aiRaw, deductionPolicy);

  // Insert NEW row (never updating the previous one).
  const created = await prisma.$transaction(async (tx) => {
    const e = await tx.writingEvaluation.create({
      data: {
        submissionId: previous.submissionId,
        teacherId: userId,
        rubricId: previous.rubricId,
        rubricSnapshot: JSON.stringify(rubricSnapshot),
        rubricSource,
        score100: result.score100,
        score10: result.score10,
        deductions: JSON.stringify(result.deductions),
        sentenceFeedback: JSON.stringify(result.sentenceFeedback),
        overallSummary: result.overallSummary,
        // Preserve any teacherComment from the previous row by default.
        teacherComment: previous.teacherComment,
        aiProvider: 'local-openai-compatible',
        aiModel: defaultModel,
        evaluationVersion: previous.evaluationVersion + 1,
        previousEvaluationId: previous.id,
      },
    });

    // Update Submission's cached fields to reflect the LATEST evaluation.
    await tx.submission.update({
      where: { id: previous.submissionId },
      data: {
        languageValidationStatus: result.languageValidationStatus,
        aiScore: Math.round(result.score100),
        aiFeedback: result.overallSummary,
        status: 'graded',
      },
    });

    return e;
  });

  return NextResponse.json({
    evaluation: {
      ...created,
      rubricSnapshot,
      deductions: result.deductions,
      sentenceFeedback: result.sentenceFeedback,
    },
  }, { status: 201 });
}

function safeParse<T>(s: string | null | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
