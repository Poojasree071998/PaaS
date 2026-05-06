import { Router } from 'express';
import * as teamController from '../controllers/teamController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', teamController.createTeam);
router.get('/', teamController.listTeams);
router.get('/:teamId', teamController.getTeam);

export default router;
