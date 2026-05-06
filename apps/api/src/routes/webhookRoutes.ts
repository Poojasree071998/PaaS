import { Router } from 'express';
import * as webhookController from '../controllers/webhookController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.get('/:projectId', webhookController.listWebhooks);
router.post('/:projectId', webhookController.createWebhook);
router.patch('/:projectId/:webhookId', webhookController.updateWebhook);
router.delete('/:projectId/:webhookId', webhookController.deleteWebhook);

router.post('/:projectId/:webhookId/test', webhookController.testWebhook);
router.get('/:projectId/:webhookId/deliveries', webhookController.listDeliveries);
router.post('/:projectId/:webhookId/redeliver/:deliveryId', webhookController.redeliver);

export default router;
