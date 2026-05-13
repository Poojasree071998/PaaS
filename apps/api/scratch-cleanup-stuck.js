const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Force-clearing stuck deployments...');
  
  // Mark all BUILDING/QUEUED as ERROR so user can restart
  await prisma.deployment.updateMany({
    where: { status: { in: ['BUILDING', 'QUEUED'] } },
    data: { 
      status: 'ERROR', 
      errorMessage: 'System reset: Please click Redeploy to start fresh.' 
    }
  });

  console.log('Cleanup complete. The in-memory build lock will be cleared when the API restarts or after the current build finishes.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
