import { Router } from 'express';
import * as deploymentController from '../controllers/deploymentController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/analyze', deploymentController.analyzeProject);
router.post('/', deploymentController.triggerDeploy);
router.get('/', deploymentController.listDeployments);
router.get('/:deploymentId', deploymentController.getDeployment);
router.get('/:deploymentId/status', deploymentController.getDeploymentStatus);
router.get('/:deploymentId/logs', deploymentController.getLogs);
router.delete('/:deploymentId', deploymentController.deleteDeployment);

router.post('/:deploymentId/promote', deploymentController.promoteDeployment);
router.post('/:deploymentId/rollback', deploymentController.rollbackDeployment);

router.get('/:deploymentId/checks', deploymentController.getChecks);

export default router;
