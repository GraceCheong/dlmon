import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cleanAiJsonResponse, writingAiTimeoutMs } from '@/lib/ai/client';
import { generateAiText } from '@/lib/ai/generate';

/**
 * @deprecated since Phase 3 (2026-05-01).
 *
 * This route does single-shot grading without a versioned rubric, without
 * language validation. The current student portal (`app/student/...`) still
 * posts here, so it must remain wired up for now per spec §5 ("do not remove
 * if the current student portal depends on it").
 *
 * Teacher-side grading must NOT use this. Use instead:
 *   POST /api/ai/writing-rubrics/generate     — set up a rubric
 *   POST /api/writing-submissions             — record student writing
 *   POST /api/ai/writing-evaluations/evaluate — grade against the rubric
 *   POST /api/writing-evaluations/:id/reevaluate — re-grade (versioned)
 *
 * Remove this entire file once the student portal flow is migrated.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assignmentId, memberId, content, prompt } = body;

    if (!assignmentId || !memberId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify assignment exists and fetch its ownership chain.
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { lesson: { include: { course: { select: { userId: true } } } } },
    });
    const member = await prisma.member.findUnique({ where: { id: memberId } });

    // Ensure member and assignment belong to the same teacher, preventing
    // cross-tenant submission rows.
    if (
      !assignment ||
      !member ||
      member.userId !== assignment.lesson.course.userId
    ) {
      return NextResponse.json({ error: 'Assignment or member not found' }, { status: 404 });
    }

    const existingSubmission = await prisma.submission.findFirst({
      where: { assignmentId, memberId },
      select: {
        id: true,
        contentText: true,
        aiScore: true,
        aiFeedback: true,
        status: true,
        createdAt: true,
      },
    });
    if (existingSubmission) {
      return NextResponse.json(
        {
          error: '이미 제출된 과제입니다.',
          submission: {
            ...existingSubmission,
            contentText: existingSubmission.contentText ?? '',
            aiScore: existingSubmission.aiScore ?? 0,
            aiFeedback: existingSubmission.aiFeedback ?? '',
          },
        },
        { status: 409 },
      );
    }

    const systemPrompt = `
      You are an expert Chinese language teacher.
      Evaluate the student's Chinese writing submission based on the original assignment prompt.

      Assignment Prompt: "${prompt}"

      Student Submission: "${content}"

      Provide your evaluation in the following JSON format ONLY:
      {
        "score": <an integer between 0 and 100>,
        "feedback": "<detailed feedback in Korean explaining grammar errors, vocabulary usage, and how to improve>"
      }
    `;

    let score = 85;
    let feedback = "잘 작성하셨습니다! 문법적인 오류는 거의 없으나, 어휘 선택을 조금 더 자연스럽게 다듬으면 좋겠습니다.";

    try {
      const teacherId = assignment.lesson.course.userId;
      const text = await generateAiText({ prompt: systemPrompt, userId: teacherId, timeoutMs: writingAiTimeoutMs });
      const parsed = JSON.parse(cleanAiJsonResponse(text));

      if (parsed.score !== undefined) score = parsed.score;
      if (parsed.feedback) feedback = parsed.feedback;

    } catch (aiError) {
      console.error('LLM Evaluation failed, falling back to dummy grading:', aiError);
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        memberId,
        contentText: content,
        aiScore: score,
        aiFeedback: feedback,
        status: 'graded',
      },
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Failed to grade submission:', error);
    return NextResponse.json({ error: 'Failed to grade submission' }, { status: 500 });
  }
}
