
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const deploymentId = 'cmp0u8b6p0001136mxd9y95t6';
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      project: {
        include: {
          envVars: true,
          databases: true
        }
      }
    }
  });

  console.log('Deployment:', JSON.stringify(deployment, null, 2));
  
  const managedDbs = await prisma.managedDatabase.findMany({
    where: { projectId: deployment?.projectId }
  });
  console.log('Managed Databases:', JSON.stringify(managedDbs, null, 2));

  await prisma.$disconnect();
}

check();
