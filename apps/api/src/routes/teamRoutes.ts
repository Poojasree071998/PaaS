import { Router } from 'express';
import * as teamController from '../controllers/teamController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.post('/', teamController.createTeam);
router.get('/', teamController.listTeams);
router.get('/:teamId', teamController.getTeam);
router.patch('/:teamId', teamController.updateTeam);
router.delete('/:teamId', teamController.deleteTeam);

router.get('/:teamId/members', teamController.listMembers);
router.post('/:teamId/members/invite', teamController.inviteMember);
router.patch('/:teamId/members/:userId', teamController.changeMemberRole);
router.delete('/:teamId/members/:userId', teamController.removeMember);

router.get('/invite/:token', teamController.getInvite);
router.post('/invite/:token/accept', teamController.acceptInvite);

export default router;
