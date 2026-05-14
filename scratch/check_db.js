
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.project.count();
    console.log('Project count:', count);
    const deployments = await prisma.deployment.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('Recent deployments:', deployments.map(d => ({ id: d.id, status: d.status })));
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
