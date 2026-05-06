import { Router } from 'express';
import * as projectController from '../controllers/projectController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:projectId', projectController.getProject);

export default router;
