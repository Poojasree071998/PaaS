const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projectId = 'cmp11e94v00ot140vnuguddxv';
  const connectionString = 'mongodb://admin:password@127.0.0.1:27017/aicall-db?authSource=admin';

  console.log('Updating Ai-Call connection strings...');

  // Update ManagedDatabase
  await prisma.managedDatabase.updateMany({
    where: { projectId },
    data: { 
      connectionString,
      host: '127.0.0.1'
    }
  });

  // Update Environment Variables
  await prisma.environmentVariable.updateMany({
    where: { projectId, key: { in: ['MONGODB_URI', 'MONGO_URI'] } },
    data: { value: connectionString }
  });

  console.log('Update complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
