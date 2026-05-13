const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dbs = await prisma.managedDatabase.findMany({
    where: { projectId: 'cmp11e94v00ot140vnuguddxv' }
  });
  console.log(JSON.stringify(dbs, null, 2));

  const project = await prisma.project.findUnique({
    where: { id: 'cmp11e94v00ot140vnuguddxv' },
    include: { envVars: true }
  });
  console.log('Project Env Vars:', JSON.stringify(project.envVars, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
