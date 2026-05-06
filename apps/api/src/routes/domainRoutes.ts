import { Router } from 'express';
import * as domainController from '../controllers/domainController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

router.get('/:projectId', domainController.listDomains);
router.post('/:projectId', domainController.addDomain);
router.delete('/:projectId/:domainId', domainController.removeDomain);

router.post('/:projectId/:domainId/verify', domainController.verifyDomain);
router.post('/:projectId/:domainId/ssl', domainController.provisionSSL);
router.patch('/:projectId/:domainId/primary', domainController.setPrimaryDomain);
router.post('/:projectId/:domainId/redirect', domainController.configureRedirect);

export default router;
