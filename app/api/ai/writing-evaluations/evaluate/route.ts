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

interface EvaluateBody {
  submissionId?: string;
  rubricId?: string; // optional override; defaults to submission.rubricId or assignment.rubricId
}

/**
 * POST /api/ai/writing-evaluations/evaluate
 *
 * First-time evaluation of a submission. Loads the resolved rubric, snapshots
 * it, calls the AI, and stores a WritingEvaluation row (version 1).
 *
 * Ownership chain: submission → assignment → lesson → course → user, AND
 * submission → member → user.
 *
 * Re-evaluation goes through `/reevaluate` instead so the version chain is
 * explicit.
 */
export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: EvaluateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.submissionId) {
    return NextResponse.json({ error: '`submissionId` is required' }, { status: 400 });
  }

  // Load + verify ownership of submission via assignment chain AND member.
  const submission = await prisma.submission.findUnique({
    where: { id: body.submissionId },
    include: {
      assignment: { include: { lesson: { include: { course: { select: { userId: true } } } } } },
      member: true,
    },
  });
  if (
    !submission ||
    submission.assignment.lesson.course.userId !== userId ||
    submission.member.userId !== userId
  ) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  if (!submission.contentText?.trim()) {
    return NextResponse.json({ error: 'Submission has no writing content to evaluate' }, { status: 400 });
  }

  // Resolve rubric (override > submission.rubricId > assignment.rubricId).
  const rubricId =
    body.rubricId ?? submission.rubricId ?? submission.assignment.rubricId ?? null;
  if (!rubricId) {
    return NextResponse.json(
      {
        error:
          'No rubric available. Provide `rubricId` in the request, attach one to the submission, or set Assignment.rubricId.',
      },
      { status: 400 },
    );
  }
  const rubric = await prisma.writingRubric.findUnique({ where: { id: rubricId } });
  if (!rubric || rubric.ownerId !== userId) {
    return NextResponse.json({ error: 'Rubric not found' }, { status: 404 });
  }

  // Parse the rubric's stored JSON strings.
  const criteriaDescription =
    safeParse<Record<string, string>>(rubric.criteria) ?? {};
  const deductionPolicy =
    safeParse<DeductionPolicy>(rubric.deductionPolicy) ?? DEFAULT_DEDUCTION_POLICY;
  const rubricSnapshot = {
    id: rubric.id,
    hskLevel: rubric.hskLevel,
    targetAudience: rubric.targetAudience,
    criteria: criteriaDescription,
    deductionPolicy,
    version: rubric.version,
    createdAt: rubric.createdAt.toISOString(),
  };

  // Call the AI.
  const prompt = buildEvaluationPrompt({
    submissionText: submission.contentText,
    assignmentPrompt: submission.assignment.prompt,
    hskLevel: rubric.hskLevel,
    targetAudience: rubric.targetAudience,
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
    console.error('Evaluation AI call failed:', e);
    return NextResponse.json(
      { error: 'AI evaluation failed', detail: (e as Error).message },
      { status: 502 },
    );
  }

  const result = normalizeEvaluationResult(aiRaw, deductionPolicy);

  // Persist evaluation + sync legacy/cached fields on Submission for back-compat.
  const evaluation = await prisma.$transaction(async (tx) => {
    const created = await tx.writingEvaluation.create({
      data: {
        submissionId: submission.id,
        teacherId: userId,
        rubricId: rubric.id,
        rubricSnapshot: JSON.stringify(rubricSnapshot),
        rubricSource: rubric.id === submission.assignment.rubricId ? 'default' : 'manual',
        score100: result.score100,
        score10: result.score10,
        deductions: JSON.stringify(result.deductions),
        sentenceFeedback: JSON.stringify(result.sentenceFeedback),
        overallSummary: result.overallSummary,
        aiProvider: 'local-openai-compatible',
        aiModel: defaultModel,
        evaluationVersion: 1,
      },
    });

    await tx.submission.update({
      where: { id: submission.id },
      data: {
        rubricId: rubric.id,
        languageValidationStatus: result.languageValidationStatus,
        // Keep legacy cached fields in sync for the older grading UI.
        aiScore: Math.round(result.score100),
        aiFeedback: result.overallSummary,
        status: 'graded',
      },
    });

    return created;
  });

  return NextResponse.json({
    evaluation: {
      ...evaluation,
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
