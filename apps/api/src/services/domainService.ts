import dns from 'dns/promises';
import prisma from '../config/prisma';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class DomainService {
  static async verifyDomain(domainId: string) {
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundError('Domain not found');

    try {
      let isVerified = false;
      
      // 1. Try real DNS resolution
      try {
        const records = await dns.resolveTxt(`_deployflow-challenge.${domain.hostname}`);
        isVerified = records.flat().includes(domain.verificationToken);
      } catch (e) {
        // DNS lookup failed
      }

      // 2. Dev Override: If DNS fails, check if we should skip the check (for testing)
      const skipCheck = process.env.SKIP_DNS_CHECK === 'true' || process.env.SKIP_DNS_CHECK === '1';
      if (!isVerified && skipCheck) {
        import('../config/logger').then(m => m.default.warn(`⚠️ DNS check skipped for ${domain.hostname} (SKIP_DNS_CHECK is enabled)`));
        isVerified = true;
      }

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

  static async listAllDomains(userId: string) {
    return prisma.domain.findMany({
      where: {
        project: {
          userId: userId
        }
      },
      include: {
        project: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  static async listDomainsByProject(projectId: string, userId: string) {
    return prisma.domain.findMany({
      where: {
        projectId,
        project: {
          userId
        }
      },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    });
  }

  static async removeDomain(domainId: string, userId: string) {
    // Ensure the domain belongs to a project owned by the user
    const domain = await prisma.domain.findFirst({
      where: {
        id: domainId,
        project: {
          userId
        }
      }
    });

    if (!domain) throw new NotFoundError('Domain not found or unauthorized');

    return prisma.domain.delete({
      where: { id: domainId }
    });
  }

  static async provisionSSL(domainId: string) {
    // 1. Simulate SSL generation delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 2. Update status to ACTIVE
    await prisma.domain.update({
      where: { id: domainId },
      data: { sslStatus: 'ACTIVE' }
    });

    return true;
  }
}
