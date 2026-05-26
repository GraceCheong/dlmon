import prisma from '@/lib/prisma';
import { requireUserOrRedirect } from '@/lib/auth-helpers';
import LessonPlanGeneratorClient from '@/components/dashboard/LessonPlanGeneratorClient';

export default async function LessonPlansPage() {
  const userId = await requireUserOrRedirect();

  const [rawPrompts, rawPlans] = await Promise.all([
    prisma.prompt.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, content: true, targetAudience: true, hskLevel: true },
    }),
    prisma.lessonPlan.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, targetAudience: true, hskLevel: true, updatedAt: true },
    }),
  ]);

  const savedPrompts = rawPrompts.map(p => ({
    ...p,
    targetAudience: p.targetAudience ?? undefined,
    hskLevel: p.hskLevel ?? undefined,
  }));
  const lessonPlans = rawPlans.map(p => ({
    ...p,
    targetAudience: p.targetAudience ?? undefined,
    hskLevel: p.hskLevel ?? undefined,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div>
      <LessonPlanGeneratorClient savedPrompts={savedPrompts} initialPlans={lessonPlans} />
    </div>
  );
}
