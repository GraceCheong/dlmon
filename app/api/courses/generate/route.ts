import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateCourseCurriculum } from '@/lib/ai/generator';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      userId: (session.user as any).id,
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
