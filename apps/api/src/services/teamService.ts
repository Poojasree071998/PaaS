import prisma from '../config/prisma';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import slugify from 'slugify';
import { TeamRole, Plan } from '@prisma/client';

export class TeamService {
  static async createTeam(userId: string, name: string) {
    const slug = slugify(name, { lower: true });
    
    const existing = await prisma.team.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError('Team slug already exists, please choose a different name');
    }

    return prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name,
          slug,
          ownerId: userId,
          plan: Plan.FREE,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: TeamRole.OWNER,
          inviteAccepted: true,
        },
      });

      return team;
    });
  }

  static async getTeam(teamId: string, userId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        }
      }
    });

    if (!team) throw new NotFoundError('Team not found');
    
    const isMember = team.members.some(m => m.userId === userId);
    if (!isMember) throw new ForbiddenError('You do not have access to this team');

    return team;
  }

  static async listUserTeams(userId: string) {
    return prisma.team.findMany({
      where: { members: { some: { userId, inviteAccepted: true } } },
      include: { _count: { select: { members: true, projects: true } } }
    });
  }
}
