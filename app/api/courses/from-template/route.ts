import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { COURSE_TEMPLATES } from '@/lib/templates/courseTemplates';


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { templateId } = await request.json();
    const template = COURSE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const userId = (session.user as any).id;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + template.weeks * 7);

    // Build full curriculum from sample weeks + generated remaining
    const curriculum = Array.from({ length: template.weeks }, (_, i) => {
      const w = i + 1;
      const sample = template.sampleWeeks.find(s => s.week === w);
      if (sample) return sample;
      return {
        week: w,
        topic: `${w}주차 수업`,
        objectives: `${template.titleKo} ${w}주차 학습 목표`,
        activities: '강의 및 연습 활동',
        assessment: '주간 과제',
      };
    });

    const syllabus = `# 강의 계획서: ${template.titleKo}\n\n## 강좌 개요\n${template.descKo}\n\n## 교육 목표\n${template.goals}\n\n## 교수법\n${template.style} 접근 방식\n\n## 평가 기준\n${template.evaluation}`;

    const course = await prisma.course.create({
      data: {
        title: template.titleKo,
        description: template.descKo,
        level: template.level,
        type: template.type,
        weeks: template.weeks,
        startDate,
        endDate,
        userId,
        curriculumPlan: { create: { data: JSON.stringify(curriculum) } },
        syllabus: { create: { content: syllabus } },
      },
    });

    return NextResponse.json(course);
  } catch (error) {
    console.error('Template course creation error:', error);
    return NextResponse.json({ error: 'Failed to create course from template' }, { status: 500 });
  }
}
