import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.patch('/:notifId/read', notificationController.markAsRead);
router.post('/read-all', notificationController.markAllAsRead);

router.get('/preferences', notificationController.getPreferences);
router.patch('/preferences', notificationController.updatePreferences);

router.post('/integrations/slack', notificationController.connectSlack);
router.post('/integrations/discord', notificationController.connectDiscord);

export default router;
