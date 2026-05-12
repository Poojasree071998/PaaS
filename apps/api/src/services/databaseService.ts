import prisma from '../config/prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { DatabaseType, DatabaseStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseService {
  static async provisionDatabase(userId: string, data: {
    teamId: string;
    name: string;
    type: DatabaseType;
    projectId?: string;
  }) {
    // --- SMART TEAM DETECTION ---
    let teamId = data.teamId;
    if (!teamId || teamId === 'default' || teamId === 'null' || teamId === '') {
      // Find the first team this user belongs to
      const firstTeam = await prisma.teamMember.findFirst({
        where: { userId, inviteAccepted: true },
        select: { teamId: true }
      });

      if (firstTeam) {
        teamId = firstTeam.teamId;
      } else {
        // Create a personal team for the user if none exists
        const newTeam = await prisma.team.create({
          data: {
            name: 'Personal Team',
            slug: `personal-${userId.slice(0, 5)}`,
            ownerId: userId,
            members: {
              create: {
                userId,
                role: 'OWNER',
                inviteAccepted: true
              }
            }
          }
        });
        teamId = newTeam.id;
      }
    }

    // Double check access
    const member = await prisma.teamMember.findFirst({
      where: { teamId, userId, inviteAccepted: true }
    });
    if (!member) throw new ForbiddenError('You do not have access to this team');

    // Simulate provisioning
    const dbId = uuidv4().slice(0, 8);
    const dbName = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${dbId}`;
    
    let connectionString = '';
    let host = '';
    let port = 0;
    let username = 'admin';
    let password = uuidv4().slice(0, 12);

    if (data.type === DatabaseType.POSTGRES) {
      host = process.env.MANAGED_POSTGRES_HOST || 'db.deployflow.io';
      port = 5432;
      connectionString = `postgresql://${username}:${password}@${host}:${port}/${dbName}?sslmode=require`;
    } else if (data.type === DatabaseType.REDIS) {
      host = process.env.MANAGED_REDIS_HOST || 'redis.deployflow.io';
      port = 6379;
      connectionString = `redis://:${password}@${host}:${port}`;
    } else if (data.type === DatabaseType.MONGODB) {
      host = process.env.MANAGED_MONGO_HOST || '127.0.0.1';
      port = 27017;
      connectionString = `mongodb://${username}:${password}@${host}:${port}/${dbName}?authSource=admin`;
    } else {
      // Default fallback
      host = 'db.deployflow.io';
      port = 5432;
      connectionString = `postgresql://${username}:${password}@${host}/${dbName}`;
    }

    return (prisma.managedDatabase as any).create({
      data: {
        ...data,
        teamId, // Use the detected or created teamId
        userId, // Link to the user who created it
        status: DatabaseStatus.ACTIVE,
        host,
        port,
        dbName,
        username,
        password, // In a real app, this should be encrypted
        connectionString,
        version: '16.2', // mock version
      }
    });
  }

  static async listDatabases(teamId: string, userId: string) {
    if (teamId && teamId !== 'null' && teamId !== '') {
      const member = await prisma.teamMember.findFirst({
        where: { teamId, userId, inviteAccepted: true }
      });

      if (member) {
        return prisma.managedDatabase.findMany({
          where: { teamId },
          include: { project: { select: { name: true } } }
        });
      }
    }

    // Default: Show all databases created by this user
    return (prisma.managedDatabase as any).findMany({
      where: { userId },
      include: { project: { select: { name: true } } }
    });
  }

  static async deleteDatabase(dbId: string, userId: string) {
    const db = await prisma.managedDatabase.findUnique({
      where: { id: dbId }
    });

    if (!db) throw new NotFoundError('Database not found');

    const member = await prisma.teamMember.findFirst({
      where: { teamId: db.teamId, userId, inviteAccepted: true }
    });

    if (!member) throw new ForbiddenError('You do not have access to this database');

    return prisma.managedDatabase.delete({
      where: { id: dbId }
    });
  }
}
