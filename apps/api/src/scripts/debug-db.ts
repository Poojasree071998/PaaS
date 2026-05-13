import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
const prisma = new PrismaClient();

async function main() {
  const allProjects = await prisma.project.findMany({
    where: {
      OR: [
        { slug: { contains: 'resume', mode: 'insensitive' } },
        { id: { contains: 'resume', mode: 'insensitive' } },
        { domains: { some: { hostname: { contains: 'resume', mode: 'insensitive' } } } }
      ]
    },
    include: { domains: true, productionDeployment: true }
  });
  console.log('Matching Projects:', JSON.stringify(allProjects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
