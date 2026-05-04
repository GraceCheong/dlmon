import { PrismaClient } from '@prisma/client';
import { COURSE_TEMPLATES } from '../lib/templates/courseTemplates';

const prisma = new PrismaClient();

async function fix() {
  try {
    const courses = await prisma.course.findMany({
      include: { curriculumPlan: true }
    });
    
    for (const c of courses) {
      if (c.curriculumPlan) {
        const data = JSON.parse(c.curriculumPlan.data);
        const hasFallback = data.some((d: any) => d.topic.includes('주차 수업'));
        
        if (hasFallback) {
          console.log(`Fixing course: ${c.title}`);
          const template = COURSE_TEMPLATES.find(t => t.titleKo === c.title || c.title.includes(t.titleKo));
          
          if (template) {
            console.log(`  Found template: ${template.titleKo}`);
            const fullCurriculum = Array.from({ length: c.weeks }, (_, i) => {
              const w = i + 1;
              const sample = template.sampleWeeks.find(s => s.week === w);
              if (sample) return sample;
              return {
                week: w,
                topic: `${w}주차 수업 (자동 생성)`,
                objectives: `${template.titleKo} ${w}주차 학습 목표`,
                activities: '강의 및 연습 활동',
                assessment: '주간 과제',
              };
            });
            
            await prisma.curriculumPlan.update({
              where: { id: c.curriculumPlan.id },
              data: { data: JSON.stringify(fullCurriculum) }
            });
            console.log(`  Updated ${c.title} with full curriculum.`);
          } else {
            console.log(`  Could not find matching template for: ${c.title}`);
          }
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
