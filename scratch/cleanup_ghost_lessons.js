/**
 * cleanup_ghost_lessons.js
 *
 * Deletes ghost lessons from the DB:
 *   1. Lessons with 0 LessonBlocks that are NOT the "keeper" for their week slot.
 *   2. For each (courseId, order) group: keep the lesson with the most blocks
 *      (or, on a tie, the earliest createdAt). Delete the rest.
 *
 * Run: node scratch/cleanup_ghost_lessons.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fetch every lesson with its block count
  const lessons = await prisma.lesson.findMany({
    include: {
      _count: { select: { blocks: true } },
    },
    orderBy: [{ courseId: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  });

  console.log(`Total lessons in DB: ${lessons.length}`);

  // Group by (courseId, order)
  const groups = new Map();
  for (const lesson of lessons) {
    const key = `${lesson.courseId}::${lesson.order}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lesson);
  }

  const toDelete = [];

  for (const [key, group] of groups) {
    if (group.length === 1) {
      // Only one lesson for this slot — delete if 0 blocks
      if (group[0]._count.blocks === 0) {
        toDelete.push({ id: group[0].id, reason: '0 blocks, sole entry', key });
      }
      continue;
    }

    // Multiple lessons for same (courseId, order):
    // Keep the one with the most blocks; on tie keep earliest createdAt
    const sorted = [...group].sort((a, b) => {
      if (b._count.blocks !== a._count.blocks) return b._count.blocks - a._count.blocks;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const [keeper, ...rest] = sorted;
    console.log(`  Slot ${key}: keeping lesson ${keeper.id} (${keeper._count.blocks} blocks), deleting ${rest.length}`);

    for (const lesson of rest) {
      toDelete.push({ id: lesson.id, reason: `duplicate slot ${key}`, key });
    }
  }

  if (toDelete.length === 0) {
    console.log('Nothing to delete. DB is clean.');
    return;
  }

  console.log(`\nLessons to delete: ${toDelete.length}`);
  for (const d of toDelete) {
    console.log(`  ${d.id}  (${d.reason})`);
  }

  // Confirm before deleting
  const ids = toDelete.map((d) => d.id);

  // Delete dependent records first (blocks, then assignments referenced to lessons)
  console.log('\nDeleting LessonBlocks...');
  const blocksDeleted = await prisma.lessonBlock.deleteMany({ where: { lessonId: { in: ids } } });
  console.log(`  Deleted ${blocksDeleted.count} blocks`);

  console.log('Deleting Assignments linked to ghost lessons...');
  const assignmentsDeleted = await prisma.assignment.deleteMany({ where: { lessonId: { in: ids } } });
  console.log(`  Deleted ${assignmentsDeleted.count} assignments`);

  console.log('Deleting ghost Lessons...');
  const deleted = await prisma.lesson.deleteMany({ where: { id: { in: ids } } });
  console.log(`  Deleted ${deleted.count} lessons`);

  console.log('\nDone.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
