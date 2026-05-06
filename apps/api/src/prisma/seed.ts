import { PrismaClient, Role, TeamRole, Plan, RepoProvider, Framework, ProjectStatus, DeploymentEnvironment, DeploymentStatus, LogLevel, DatabaseType, DatabaseStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@deployflow.app' },
    update: {},
    create: {
      email: 'admin@deployflow.app',
      password: hashedPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@deployflow.app' },
    update: {},
    create: {
      email: 'user@deployflow.app',
      password: hashedPassword,
      name: 'Regular User',
      role: Role.USER,
    },
  });

  // 2. Create Team
  const team = await prisma.team.upsert({
    where: { slug: 'deployflow-team' },
    update: {},
    create: {
      name: 'DeployFlow Team',
      slug: 'deployflow-team',
      ownerId: admin.id,
      plan: Plan.PRO,
    },
  });

  // 3. Add Members
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: admin.id } },
    update: { role: TeamRole.OWNER },
    create: {
      teamId: team.id,
      userId: admin.id,
      role: TeamRole.OWNER,
      inviteAccepted: true,
    },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    update: { role: TeamRole.MEMBER },
    create: {
      teamId: team.id,
      userId: user.id,
      role: TeamRole.MEMBER,
      inviteAccepted: true,
    },
  });

  // 4. Create Projects
  const projectsData = [
    {
      name: 'My Next.js App',
      slug: 'my-nextjs-app',
      framework: Framework.NEXTJS,
      repoProvider: RepoProvider.GITHUB,
      repoUrl: 'https://github.com/user/nextjs-app',
      repoId: '123456',
      repoBranch: 'main',
      buildCommand: 'npm run build',
      installCommand: 'npm install',
      outputDirectory: '.next',
    },
    {
      name: 'Express API',
      slug: 'express-api',
      framework: Framework.EXPRESS,
      repoProvider: RepoProvider.GITHUB,
      repoUrl: 'https://github.com/user/express-api',
      repoId: '234567',
      repoBranch: 'master',
      buildCommand: 'npm run build',
      installCommand: 'npm install',
      outputDirectory: 'dist',
    },
    {
      name: 'Static Site',
      slug: 'static-site',
      framework: Framework.STATIC,
      repoProvider: RepoProvider.GITLAB,
      repoUrl: 'https://gitlab.com/user/static-site',
      repoId: '345678',
      repoBranch: 'main',
      buildCommand: 'npm run build',
      installCommand: 'npm install',
      outputDirectory: 'build',
    },
  ];

  for (const p of projectsData) {
    const project = await prisma.project.upsert({
      where: { teamId_slug: { teamId: team.id, slug: p.slug } },
      update: {},
      create: {
        ...p,
        teamId: team.id,
        userId: admin.id,
      },
    });

    // 5. Create Deployments for each project
    const statuses = [
      DeploymentStatus.READY,
      DeploymentStatus.READY,
      DeploymentStatus.BUILDING,
      DeploymentStatus.ERROR,
      DeploymentStatus.QUEUED,
    ];

    for (let i = 0; i < 5; i++) {
      const deployment = await prisma.deployment.create({
        data: {
          projectId: project.id,
          teamId: team.id,
          userId: admin.id,
          branch: project.repoBranch,
          commitSha: `sha-${Math.random().toString(36).substring(7)}`,
          commitMessage: `Deployment #${i + 1}`,
          commitAuthor: 'Admin',
          status: statuses[i],
          environment: DeploymentEnvironment.PRODUCTION,
          url: statuses[i] === DeploymentStatus.READY ? `https://${project.slug}-${i}.deployflow.app` : null,
          buildDuration: statuses[i] === DeploymentStatus.READY ? Math.floor(Math.random() * 300) : null,
          deployDuration: statuses[i] === DeploymentStatus.READY ? Math.floor(Math.random() * 60) : null,
        },
      });

      // 6. Build Logs
      await prisma.buildLog.createMany({
        data: [
          { deploymentId: deployment.id, level: LogLevel.INFO, message: 'Cloning repository...', timestamp: new Date() },
          { deploymentId: deployment.id, level: LogLevel.INFO, message: 'Installing dependencies...', timestamp: new Date() },
          { deploymentId: deployment.id, level: LogLevel.INFO, message: 'Running build command...', timestamp: new Date() },
          { deploymentId: deployment.id, level: statuses[i] === DeploymentStatus.ERROR ? LogLevel.ERROR : LogLevel.INFO, message: statuses[i] === DeploymentStatus.ERROR ? 'Build failed: Process exited with code 1' : 'Build successful!', timestamp: new Date() },
        ],
      });
    }

    // 7. Sample Env Vars
    await prisma.environmentVariable.createMany({
      data: [
        { projectId: project.id, teamId: team.id, key: 'DATABASE_URL', value: 'encrypted-url', environment: 'ALL', isSecret: true },
        { projectId: project.id, teamId: team.id, key: 'API_KEY', value: 'encrypted-key', environment: 'PRODUCTION', isSecret: true },
      ],
    });
  }

  // 8. Custom Domains
  const nextjsProject = await prisma.project.findFirst({ where: { slug: 'my-nextjs-app' } });
  if (nextjsProject) {
    await prisma.domain.create({
      data: {
        projectId: nextjsProject.id,
        teamId: team.id,
        hostname: 'www.my-nextjs-app.com',
        verified: true,
        verificationToken: 'token-123',
        sslStatus: 'ACTIVE',
      },
    });
    await prisma.domain.create({
      data: {
        projectId: nextjsProject.id,
        teamId: team.id,
        hostname: 'staging.my-nextjs-app.com',
        verified: false,
        verificationToken: 'token-456',
        sslStatus: 'PENDING',
      },
    });
  }

  // 9. Managed Database
  await prisma.managedDatabase.create({
    data: {
      teamId: team.id,
      name: 'production-db',
      type: DatabaseType.POSTGRES,
      status: DatabaseStatus.ACTIVE,
      host: 'localhost',
      port: 5432,
      dbName: 'prod_db',
      username: 'admin',
      password: 'encrypted-password',
      connectionString: 'encrypted-connection-string',
      version: '15.2',
      storageGB: 10,
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
