const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const deps = await prisma.deployment.findMany({
    where: { projectId: 'cmp2fg5uf0069chn5u936wn2w' },
    select: { id: true, status: true, url: true }
  });
  console.log(JSON.stringify(deps, null, 2));
}
check().catch(console.error).finally(() => prisma.$disconnect());
