import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUserOrUnauthorized } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const auth = await requireUserOrUnauthorized();
  if (auth instanceof NextResponse) return auth;
  const userId = auth;

  const { templateId } = await request.json();
  if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });

  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(template.content);
  } catch {
    // fall through with empty content
  }

  const sections: { title: string; activities: string[]; notes: string }[] = [];
  if (Array.isArray(parsed.sections)) {
    for (const s of parsed.sections as Record<string, unknown>[]) {
      const activities = Array.isArray(s.activities)
        ? (s.activities as string[]).filter(Boolean)
        : [];
      sections.push({
        title: typeof s.title === 'string' ? s.title : '',
        activities,
        notes: typeof s.notes === 'string' ? s.notes : '',
      });
    }
  }

  const weeks = sections.length > 0 ? sections.length : 15;
  const curriculum = Array.from({ length: weeks }, (_, i) => {
    const section = sections[i];
    return {
      week: i + 1,
      topic: section?.title || `${i + 1}회차 수업`,
      objectives: '',
      activities: section?.activities.join('\n') || '',
      assessment: section?.notes || '',
    };
  });

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + weeks * 7);

  const overview = typeof parsed.overview === 'string' ? parsed.overview : '';
  const level = template.targetAudience || 'Intermediate';
  const type = template.type || 'Language';

  const syllabusContent = [
    `# 강의 계획서: ${template.title}`,
    '',
    `## 강좌 개요`,
    template.description || overview || '',
    '',
    `## 수업 회차`,
    ...curriculum.map((w) => `- ${w.week}회차: ${w.topic}`),
  ].join('\n');

  const course = await prisma.course.create({
    data: {
      title: template.title,
      description: template.description || overview || null,
      level,
      type,
      weeks,
      startDate,
      endDate,
      userId,
      curriculumPlan: { create: { data: JSON.stringify(curriculum) } },
      syllabus: { create: { content: syllabusContent } },
    },
  });

  return NextResponse.json(course);
}
