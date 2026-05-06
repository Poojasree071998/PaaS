import { Router } from 'express';
import * as envController from '../controllers/envController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.get('/:projectId', envController.listEnvVars);
router.post('/:projectId', envController.addEnvVar);
router.put('/:projectId/:envId', envController.updateEnvVar);
router.delete('/:projectId/:envId', envController.deleteEnvVar);
router.post('/:projectId/bulk', envController.bulkCreateEnvVars);
router.get('/:projectId/export', envController.exportEnvVars);

export default router;
