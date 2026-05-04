const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seed ---');
  
  // 1. Create User
  const user = await prisma.user.upsert({
    where: { email: 'teacher@letto.ai' },
    update: {},
    create: {
      email: 'teacher@letto.ai',
      name: 'Test Teacher'
    }
  });
  console.log('User created/found:', user.id);

  // 2. Create Course
  const course = await prisma.course.create({
    data: {
      title: 'Chinese for Beginners',
      description: 'A comprehensive starter course for Mandarin Chinese.',
      level: 'Beginner',
      type: 'Language',
      weeks: 15,
      userId: user.id,
      curriculumPlan: {
        create: {
          data: JSON.stringify([
            { week: 1, topic: 'Tones and Pinyin', items: [{ title: 'Morning Greeting', id: 'l1' }] }
          ])
        }
      },
      syllabus: {
        create: {
          content: '# Syllabus: Chinese for Beginners\n\nThis is a test syllabus content.'
        }
      }
    }
  });
  console.log('Course created:', course.id);

  // 3. Create Lesson
  const lesson = await prisma.lesson.create({
    data: {
      courseId: course.id,
      title: 'Intro to Tones',
      order: 1,
      slug: 'intro-to-tones',
      status: 'published',
      blocks: {
        create: [
          { type: 'text', content: JSON.stringify({ text: 'Mandarin has four main tones.' }), order: 1 }
        ]
      }
    }
  });
  console.log('Lesson created:', lesson.id);

  console.log('--- Seed Complete ---');
  console.log('IDs:', JSON.stringify({ 
    courseId: course.id, 
    lessonId: lesson.id, 
    slug: lesson.slug 
  }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
