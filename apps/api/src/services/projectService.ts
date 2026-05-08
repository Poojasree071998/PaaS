import prisma from '../config/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import slugify from 'slugify';
import { Framework, RepoProvider, ProjectStatus } from '@prisma/client';

export class ProjectService {
  static async createProject(data: {
    teamId: string;
    userId: string;
    name: string;
    repoProvider: RepoProvider;
    repoUrl: string;
    repoId: string;
    repoBranch: string;
    framework: Framework;
    buildCommand?: string;
    installCommand?: string;
    outputDirectory?: string;
  }) {
    const slug = slugify(data.name, { lower: true });

    // Check if slug exists in team
    const existing = await prisma.project.findFirst({
      where: { teamId: data.teamId, slug }
    });

    if (existing) {
      throw new ConflictError('Project slug already exists in this team');
    }

    return prisma.project.create({
      data: {
        ...data,
        slug,
        status: ProjectStatus.ACTIVE,
      }
    });
  }

  static async getProject(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { team: true, deployments: { take: 5, orderBy: { createdAt: 'desc' } } }
    });

    if (!project) throw new NotFoundError('Project not found');

    // Check if user is member of the team
    const member = await prisma.teamMember.findFirst({
      where: { teamId: project.teamId, userId, inviteAccepted: true }
    });

    if (!member) throw new ForbiddenError('You do not have access to this project');

    return project;
  }

  static async listProjects(teamId: string, userId: string) {
    // Check access
    const member = await prisma.teamMember.findFirst({
      where: { teamId, userId, inviteAccepted: true }
    });

    if (!member) throw new ForbiddenError('You do not have access to this team');

    return prisma.project.findMany({
      where: { teamId },
      include: { _count: { select: { deployments: true, domains: true } } }
    });
  }

  static async updateProject(projectId: string, userId: string, data: any) {
    const project = await this.getProject(projectId, userId);

    const { envVars, ...rest } = data;

    // Update main project fields
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: rest
    });

    // Update Environment Variables if provided
    if (envVars && Array.isArray(envVars)) {
      // For simplicity, we'll replace them all or update matches
      // A more robust way would be to diff them, but for now we'll do a simple upsert
      for (const env of envVars) {
        await prisma.environmentVariable.upsert({
          where: {
            projectId_key_environment: {
              projectId,
              key: env.key,
              environment: env.environment || 'ALL'
            }
          },
          update: { value: env.value },
          create: {
            projectId,
            teamId: project.teamId,
            key: env.key,
            value: env.value,
            environment: env.environment || 'ALL'
          }
        });
      }
    }

    return updated;
  }

  static async deleteProject(projectId: string, userId: string) {
    await this.getProject(projectId, userId);
    
    return prisma.project.delete({
      where: { id: projectId }
    });
  }
}
