import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();
router.use(authenticate);

router.get('/:projectId/overview', analyticsController.getOverview);
router.get('/:projectId/web-vitals', analyticsController.getWebVitals);
router.get('/:projectId/functions', analyticsController.getFunctions);
router.get('/:projectId/traffic', analyticsController.getTraffic);
router.get('/team/:teamId/usage', analyticsController.getUsage);

export default router;
