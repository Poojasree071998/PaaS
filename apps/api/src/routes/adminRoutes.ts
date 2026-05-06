import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();
router.use(authenticate);

// In a real scenario, we would also use a requireRole middleware here
router.get('/users', adminController.listUsers);
router.patch('/users/:userId/suspend', adminController.suspendUser);
router.get('/projects', adminController.listProjects);
router.get('/deployments', adminController.listDeployments);
router.get('/stats', adminController.getStats);

export default router;
