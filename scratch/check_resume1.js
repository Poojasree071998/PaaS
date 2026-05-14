
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const projects = await prisma.project.findMany({
      where: { repoUrl: { contains: 'resume1' } },
      include: { deployments: { orderBy: { createdAt: 'desc' }, take: 5 } }
    });
    console.log('Projects found:', JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
