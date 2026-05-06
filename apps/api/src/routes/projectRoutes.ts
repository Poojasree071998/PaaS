import { Router } from 'express';
import * as projectController from '../controllers/projectController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', projectController.createProject);
router.get('/', projectController.listProjects);

router.get('/repos/search', projectController.searchRepos);
router.get('/repos/detect-framework', projectController.detectFramework);

router.get('/:projectId', projectController.getProject);
router.patch('/:projectId', projectController.updateProject);
router.delete('/:projectId', projectController.deleteProject);

router.get('/:projectId/stats', projectController.getProjectStats);
router.post('/:projectId/pause', projectController.pauseProject);
router.post('/:projectId/resume', projectController.resumeProject);

export default router;
