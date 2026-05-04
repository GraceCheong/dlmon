const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding testing data...');
  
  // 1. Ensure test user
  let user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test Teacher',
        password: 'password',
      }
    });
  }
  
  // 2. Ensure at least one member (student)
  let member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) {
    member = await prisma.member.create({
      data: {
        name: 'John Student',
        email: 'john@example.com',
        userId: user.id,
      }
    });
  }

  // 3. Ensure a course
  let course = await prisma.course.findFirst({ where: { userId: user.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        title: 'Chinese 101 (Test)',
        level: 'beginner',
        type: 'General',
        userId: user.id,
      }
    });
  }

  // 4. Ensure a lesson
  let lesson = await prisma.lesson.findFirst({ where: { courseId: course.id } });
  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: {
        title: 'Week 1: Greetings',
        courseId: course.id,
        order: 1,
        slug: 'week-1-greetings'
      }
    });
  }

  console.log('Seed complete!');
  console.log('User:', user.id);
  console.log('Course:', course.id);
  console.log('Lesson:', lesson.id);
  console.log('Member:', member.id);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
