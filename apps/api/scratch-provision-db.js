const { PrismaClient, DatabaseType, DatabaseStatus } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  const projectId = 'cmp11e94v00ot140vnuguddxv';
  const userId = 'cmp0q4m790000is560klo4vst';
  const teamId = 'cmp0q4n1l0001is569usjmvrc';

  console.log('Provisioning MongoDB for project:', projectId);

  const dbId = uuidv4().slice(0, 8);
  const dbName = `aicall-db-${dbId}`;
  const host = 'mongo.deployflow.io';
  const port = 27017;
  const username = 'admin';
  const password = uuidv4().slice(0, 12);
  const connectionString = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority`;

  const db = await prisma.managedDatabase.create({
    data: {
      teamId,
      userId,
      projectId,
      name: 'Ai-Call MongoDB',
      type: DatabaseType.MONGODB,
      status: DatabaseStatus.ACTIVE,
      host,
      port,
      dbName,
      username,
      password,
      connectionString,
      version: '6.0'
    }
  });

  console.log('Database provisioned:', db.id);

  // Also add it as an environment variable for the project just in case
  await prisma.environmentVariable.upsert({
    where: {
      projectId_key_environment: {
        projectId,
        key: 'MONGODB_URI',
        environment: 'ALL'
      }
    },
    update: { value: connectionString },
    create: {
      projectId,
      teamId,
      key: 'MONGODB_URI',
      value: connectionString,
      environment: 'ALL'
    }
  });

  console.log('Environment variable MONGODB_URI set.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
