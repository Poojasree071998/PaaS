const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const deploymentId = 'cmp2fg7ch006bchn5otb6ab7p';
  const logs = await p.buildLog.findMany({
    where: { deploymentId },
    orderBy: { timestamp: 'asc' }
  });
  console.log(logs.map(l => l.message).join('\n'));
}
run().catch(console.error).finally(() => p.$disconnect());
