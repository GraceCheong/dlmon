import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { COURSE_TEMPLATES } from '@/lib/templates/courseTemplates';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';


export async function POST(request: Request) {
  try {
    const auth = await requireUserOrUnauthorized();
    if (auth instanceof NextResponse) return auth;
    const userId = auth;

    const { templateId } = await request.json();
    const template = COURSE_TEMPLATES.find(t => t.id === templateId);
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

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
        topic: `${w}회차 수업`,
        objectives: `${template.titleKo} ${w}회차 학습 목표`,
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
