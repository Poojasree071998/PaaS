import { Router } from 'express';
import * as domainController from '../controllers/domainController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.use(authenticate);

// Global domain management
router.get('/', domainController.listAllDomains);

// Project-specific domain management
router.get('/:projectId', domainController.listDomains);
router.post('/:projectId', domainController.addDomain);

// Specific domain actions
router.delete('/:domainId', domainController.removeDomain);
router.post('/:domainId/verify', domainController.verifyDomain);
router.post('/:domainId/ssl', domainController.provisionSSL);
router.patch('/:domainId/primary', domainController.setPrimaryDomain);
router.post('/:domainId/redirect', domainController.configureRedirect);

export default router;
