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
}
