import prisma from '../config/prisma';
import logger from '../config/logger';

export class NotificationService {
  static async sendNotification(userId: string, title: string, message: string, type: string, teamId?: string) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          teamId,
          title,
          message,
          type,
        }
      });
      
      // logic for email, slack, discord would go here
      logger.info(`Notification sent to user ${userId}: ${title}`);
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }
}
