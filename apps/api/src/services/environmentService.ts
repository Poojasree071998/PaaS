import prisma from '../config/prisma';
import { CryptoUtils } from '../utils/crypto';
import { EnvEnvironment } from '@prisma/client';

export class EnvironmentService {
  static async addVariable(projectId: string, teamId: string, key: string, value: string, environment: EnvEnvironment = 'ALL', isSecret: boolean = true) {
    const encryptedValue = CryptoUtils.encrypt(value);
    
    return prisma.environmentVariable.upsert({
      where: {
        projectId_key_environment: { projectId, key, environment }
      },
      update: { value: encryptedValue, isSecret },
      create: { projectId, teamId, key, value: encryptedValue, environment, isSecret }
    });
  }

  static async getVariables(projectId: string, decrypt: boolean = false) {
    const vars = await prisma.environmentVariable.findMany({
      where: { projectId }
    });

    return vars.map(v => ({
      ...v,
      value: decrypt ? CryptoUtils.decrypt(v.value) : (v.isSecret ? '********' : CryptoUtils.decrypt(v.value))
    }));
  }
}
