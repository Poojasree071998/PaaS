import { Router } from 'express';
import * as tokenController from '../controllers/tokenController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', tokenController.listTokens);
router.post('/', tokenController.createToken);
router.delete('/:tokenId', tokenController.revokeToken);

export default router;
