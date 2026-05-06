import dns from 'dns/promises';
import prisma from '../config/prisma';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class DomainService {
  static async verifyDomain(domainId: string) {
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundError('Domain not found');

    try {
      const records = await dns.resolveTxt(`_deployflow-challenge.${domain.hostname}`);
      const isVerified = records.flat().includes(domain.verificationToken);

      if (isVerified) {
        await prisma.domain.update({
          where: { id: domainId },
          data: { verified: true, updatedAt: new Date() }
        });
      }

      return isVerified;
    } catch (error) {
      return false;
    }
  }

  static async addDomain(projectId: string, teamId: string, hostname: string) {
    const verificationToken = `df_${Math.random().toString(36).substring(2, 15)}`;
    
    return prisma.domain.create({
      data: {
        projectId,
        teamId,
        hostname,
        verificationToken,
        verified: false,
        sslStatus: 'PENDING'
      }
    });
  }
}
