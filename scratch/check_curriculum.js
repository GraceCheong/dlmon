const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const courses = await prisma.course.findMany({
      include: { curriculumPlan: true }
    });
    
    for (const c of courses) {
      if (c.curriculumPlan) {
        const data = JSON.parse(c.curriculumPlan.data);
        const hasFallback = data.some(d => d.topic.includes('주차 수업') || d.topic.includes('주차:'));
        console.log(`Course [${c.id}] ${c.title} (Weeks: ${c.weeks}) - Has Fallback/Mock: ${hasFallback}`);
        if (hasFallback) {
          console.log(`  Sample:`, data.slice(0, 4).map(d => d.topic));
        }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
