import { NextResponse } from 'next/server';
import { generateCourseCurriculum } from '@/lib/ai/generator';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const auth = await requireUserOrUnauthorized();
    if (auth instanceof NextResponse) return auth;
    const userId = auth;

    const body = await request.json();
    
    const course = await generateCourseCurriculum({
      title: body.title,
      description: body.description,
      level: body.level,
      weeks: body.weeks || 15,
      type: body.type,
      style: body.style,
      evaluation: body.evaluation,
      goals: body.goals,
      keywords: body.keywords,
      language: body.language,
      startDate: body.startDate,
      userId,
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Course generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate course' },
      { status: 500 }
    );
  }
}
