
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: 'cmp2hg1hn00tz56uubjuogoya' }
    });
    console.log('Deployment meta:', deployment.meta);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
