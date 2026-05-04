const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const courseCount = await prisma.course.count();
    const curriculumCount = await prisma.curriculumPlan.count();
    const syllabusCount = await prisma.syllabus.count();
    const lessonCount = await prisma.lesson.count();
    const blockCount = await prisma.lessonBlock.count();

    console.log('--- DB Check ---');
    console.log(`Courses: ${courseCount}`);
    console.log(`Curriculum Plans: ${curriculumCount}`);
    console.log(`Syllabi: ${syllabusCount}`);
    console.log(`Lessons: ${lessonCount}`);
    console.log(`Lesson Blocks: ${blockCount}`);

    if (courseCount > 0) {
      const courses = await prisma.course.findMany({ take: 1 });
      console.log('Recent Course:', courses[0].title);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
