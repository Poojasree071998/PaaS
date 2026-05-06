import { Router } from 'express';
import * as deploymentController from '../controllers/deploymentController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// Make deployment trigger and details public for local testing demo
router.post('/', deploymentController.triggerDeploy);
router.get('/:deploymentId', deploymentController.getDeployment);
router.get('/:deploymentId/logs', deploymentController.getLogs);

router.use(authenticate);

router.get('/', deploymentController.listDeployments);
router.delete('/:deploymentId', deploymentController.cancelDeployment);

router.post('/:deploymentId/rollback', deploymentController.rollbackDeployment);
router.post('/:deploymentId/promote', deploymentController.promoteDeployment);
router.get('/:deploymentId/checks', deploymentController.getChecks);

export default router;
