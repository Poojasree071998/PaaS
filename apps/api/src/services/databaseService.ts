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
    // Check team access (Skip check for 'default' team for simplified demo flow)
    if (data.teamId !== 'default') {
      const member = await prisma.teamMember.findFirst({
        where: { teamId: data.teamId, userId, inviteAccepted: true }
      });

      if (!member) throw new ForbiddenError('You do not have access to this team');
    }

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
      host = process.env.MANAGED_MONGO_HOST || 'mongo.deployflow.io';
      port = 27017;
      connectionString = `mongodb+srv://${username}:${password}@${host}/${dbName}?retryWrites=true&w=majority`;
    } else {
      // Default fallback
      host = 'db.deployflow.io';
      port = 5432;
      connectionString = `postgresql://${username}:${password}@${host}/${dbName}`;
    }

    return prisma.managedDatabase.create({
      data: {
        ...data,
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
    const member = await prisma.teamMember.findFirst({
      where: { teamId, userId, inviteAccepted: true }
    });

    if (!member) throw new ForbiddenError('You do not have access to this team');

    return prisma.managedDatabase.findMany({
      where: { teamId },
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
