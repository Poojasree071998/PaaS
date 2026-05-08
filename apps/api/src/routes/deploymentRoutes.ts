import { Router } from 'express';
import * as deploymentController from '../controllers/deploymentController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// Make deployment trigger, details, and list public for local testing demo
router.post('/analyze', deploymentController.analyzeProject);
router.post('/', deploymentController.triggerDeploy);
router.get('/', deploymentController.listDeployments);
router.get('/:deploymentId', deploymentController.getDeployment);
router.get('/:deploymentId/status', deploymentController.getDeploymentStatus);
router.get('/:deploymentId/logs', deploymentController.getLogs);

router.use(authenticate);
router.delete('/:deploymentId', deploymentController.cancelDeployment);

router.post('/:deploymentId/rollback', deploymentController.rollbackDeployment);
router.post('/:deploymentId/promote', deploymentController.promoteDeployment);
router.get('/:deploymentId/checks', deploymentController.getChecks);

export default router;
