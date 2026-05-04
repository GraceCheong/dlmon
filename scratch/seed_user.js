const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'test@example.com';
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: 'password',
      name: 'Test Teacher'
    },
    create: {
      email,
      password: 'password',
      name: 'Test Teacher'
    }
  });
  console.log('Seeded user:', user);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
