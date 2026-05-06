import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateText } from 'ai';
import { aiClient, defaultModel } from '@/lib/ai/client';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';
import {
  DEFAULT_CRITERIA_DESCRIPTION,
  DEFAULT_DEDUCTION_POLICY,
  buildRubricGenerationPrompt,
} from '@/lib/writing-evaluation';

interface GenerateRubricBody {
  hskLevel?: string;
  targetAudience?: string;
  courseId?: string;
  lessonId?: string;
  assignmentId?: string;
  /**
   * Manual override: when present, skip the AI call and store the manual
   * rubric directly. Spec section 4.1 + design decision "AI + manual override".
   */
  manualRubric?: {
    criteria: Record<string, string>;
    deductionPolicy: Record<string, number>;
  };
}

/**
 * POST /api/ai/writing-rubrics/generate
 *
 * Either generates a rubric via the local LLM (default) OR stores a teacher-
 * provided manual rubric. Persists the result and returns the row.
 *
 * TODO(strict-auth): when Tier-1 hardening lands, drop the test-user fallback
 * inherited from `requireUserOrUnauthorized`.
 */
export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  let body: GenerateRubricBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const hskLevel = body.hskLevel?.trim();
  const targetAudience = body.targetAudience?.trim();
  if (!hskLevel || !targetAudience) {
    return NextResponse.json(
      { error: '`hskLevel` and `targetAudience` are required' },
      { status: 400 },
    );
  }

  // Ownership checks for any optional scope IDs that the rubric is attached to.
  if (body.courseId) {
    const course = await prisma.course.findUnique({ where: { id: body.courseId } });
    if (!course || course.userId !== userId) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
  }
  if (body.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: body.lessonId },
      include: { course: { select: { userId: true } } },
    });
    if (!lesson || lesson.course.userId !== userId) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }
  }
  if (body.assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: body.assignmentId },
      include: { lesson: { include: { course: { select: { userId: true } } } } },
    });
    if (!assignment || assignment.lesson.course.userId !== userId) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
  }

  let criteria: Record<string, string>;
  let deductionPolicy: Record<string, number>;
  let createdByAi = false;
  let aiProvider: string | undefined;
  let aiModel: string | undefined;

  if (body.manualRubric) {
    // ---- Manual override path ----
    if (
      !body.manualRubric.criteria ||
      typeof body.manualRubric.criteria !== 'object' ||
      !body.manualRubric.deductionPolicy ||
      typeof body.manualRubric.deductionPolicy !== 'object'
    ) {
      return NextResponse.json(
        { error: '`manualRubric` must include `criteria` and `deductionPolicy`' },
        { status: 400 },
      );
    }
    const policySum = Object.values(body.manualRubric.deductionPolicy).reduce(
      (a, b) => a + (typeof b === 'number' ? b : 0),
      0,
    );
    if (policySum !== 100) {
      return NextResponse.json(
        { error: '`deductionPolicy` values must sum to exactly 100', actualSum: policySum },
        { status: 400 },
      );
    }
    criteria = body.manualRubric.criteria;
    deductionPolicy = body.manualRubric.deductionPolicy;
  } else {
    // ---- AI generation path ----
    const prompt = buildRubricGenerationPrompt({
      hskLevel,
      targetAudience,
      assignmentPrompt: undefined,
    });
    try {
      const { text } = await generateText({
        model: aiClient(defaultModel),
        prompt,
      });
      // Strip code fences if the model wrapped the JSON in them.
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);
      criteria =
        parsed.criteria && typeof parsed.criteria === 'object'
          ? parsed.criteria
          : DEFAULT_CRITERIA_DESCRIPTION;
      deductionPolicy =
        parsed.deductionPolicy && typeof parsed.deductionPolicy === 'object'
          ? parsed.deductionPolicy
          : DEFAULT_DEDUCTION_POLICY;
      // Fall back if AI-produced policy doesn't sum to 100.
      const sum = Object.values(deductionPolicy).reduce(
        (a, b) => a + (typeof b === 'number' ? b : 0),
        0,
      );
      if (sum !== 100) {
        deductionPolicy = DEFAULT_DEDUCTION_POLICY;
      }
      createdByAi = true;
      aiProvider = 'local-openai-compatible';
      aiModel = defaultModel;
    } catch (e) {
      // AI failure: fall back to defaults rather than 500 — teacher can edit.
      console.error('Rubric AI generation failed; using defaults:', e);
      criteria = DEFAULT_CRITERIA_DESCRIPTION;
      deductionPolicy = DEFAULT_DEDUCTION_POLICY;
      createdByAi = true;
      aiProvider = 'fallback-defaults';
      aiModel = defaultModel;
    }
  }

  const rubric = await prisma.writingRubric.create({
    data: {
      ownerId: userId,
      courseId: body.courseId ?? null,
      lessonId: body.lessonId ?? null,
      assignmentId: body.assignmentId ?? null,
      hskLevel,
      targetAudience,
      criteria: JSON.stringify(criteria),
      deductionPolicy: JSON.stringify(deductionPolicy),
      createdByAi,
      aiProvider: aiProvider ?? null,
      aiModel: aiModel ?? null,
    },
  });

  // If attached to an assignment and that assignment has no rubric yet,
  // wire it as the default.
  if (body.assignmentId) {
    const assignment = await prisma.assignment.findUnique({ where: { id: body.assignmentId } });
    if (assignment && !assignment.rubricId) {
      await prisma.assignment.update({
        where: { id: body.assignmentId },
        data: { rubricId: rubric.id },
      });
    }
  }

  return NextResponse.json({
    rubric: {
      ...rubric,
      criteria,
      deductionPolicy,
    },
  }, { status: 201 });
}
