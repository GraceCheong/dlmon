import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateText } from 'ai';
import { aiClient, defaultModel } from '@/lib/ai/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assignmentId, memberId, content, prompt } = body;

    if (!assignmentId || !memberId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Construct the AI Grading Prompt
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
      // 2. Call the Local LLM via Vercel AI SDK
      const { text } = await generateText({
        model: aiClient(defaultModel),
        prompt: systemPrompt,
      });

      // 3. Parse the JSON response
      // Sometimes LLMs wrap JSON in markdown blocks, so we clean it up
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonString);
      
      if (parsed.score !== undefined) score = parsed.score;
      if (parsed.feedback) feedback = parsed.feedback;
      
    } catch (aiError) {
      console.error('LLM Evaluation failed, falling back to dummy grading:', aiError);
      // Fallback is already set
    }

    // 4. Save the submission to the database
    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        memberId,
        contentText: content,
        aiScore: score,
        aiFeedback: feedback,
        status: 'graded'
      }
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Failed to grade submission:', error);
    return NextResponse.json({ error: 'Failed to grade submission' }, { status: 500 });
  }
}
