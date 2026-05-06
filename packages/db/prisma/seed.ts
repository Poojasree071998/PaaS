import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const team = await prisma.team.create({
    data: {
      name: 'Personal Workspace',
      slug: 'personal',
    },
  });

  const projects = [
    { name: 'Ecommerce Frontend', slug: 'ecommerce-frontend', framework: 'NEXTJS' },
    { name: 'Marketing Landing', slug: 'marketing-landing', framework: 'ASTRO' },
    { name: 'Analytics API', slug: 'analytics-api', framework: 'EXPRESS' },
  ];

  for (const p of projects) {
    const project = await prisma.project.create({
      data: {
        ...p,
        teamId: team.id,
        repoUrl: `https://github.com/demo/${p.slug}`,
      },
    });

    // Create a mock deployment
    await prisma.deployment.create({
      data: {
        projectId: project.id,
        status: 'READY',
        url: `${p.slug}.deployflow.app`,
        branch: 'main',
        logs: {
          create: [
            { content: 'Starting build...', level: 'info' },
            { content: 'Successfully deployed!', level: 'info' },
          ],
        },
      },
    });
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
