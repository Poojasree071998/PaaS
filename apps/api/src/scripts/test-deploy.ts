import prisma from '../config/prisma';
import { BuildService } from '../services/buildService';
import logger from '../config/logger';
import { RepoProvider, Framework } from '@prisma/client';

async function testDeployment() {
  try {
    logger.info('🧪 Starting Deployment Test...');

    // 1. Ensure we have a test user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'test@deployflow.app',
          password: 'hashed_password',
          name: 'Test User',
        }
      });
      logger.info('👤 Created test user');
    }

    // 2. Ensure we have a test team
    let team = await prisma.team.findFirst();
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: 'Test Team',
          slug: 'test-team',
          ownerId: user.id,
        }
      });
      logger.info('👥 Created test team');
    }

    // 3. Create a test project
    const project = await prisma.project.create({
      data: {
        name: 'Test App ' + Date.now().toString().slice(-4),
        slug: 'test-app-' + Date.now(),
        teamId: team.id,
        userId: user.id,
        repoProvider: RepoProvider.GITHUB,
        repoUrl: 'https://github.com/vercel/next.js',
        repoId: 'test-repo-id',
        framework: Framework.NEXTJS,
      }
    });
    logger.info(`📁 Created test project: ${project.name}`);

    // 4. Trigger deployment
    const deployment = await BuildService.triggerBuild(project.id, user.id);
    logger.info(`🚀 Deployment triggered! ID: ${deployment.id}`);
    logger.info('✅ Check your dashboard deployments tab to see the progress.');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDeployment();
