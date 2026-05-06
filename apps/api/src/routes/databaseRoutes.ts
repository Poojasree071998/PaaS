import { Router } from 'express';
import * as databaseController from '../controllers/databaseController';
import { authenticate } from '../middlewares/authenticate';

const router = Router();
router.use(authenticate);

router.get('/', databaseController.listDatabases);
router.post('/', databaseController.provisionDatabase);
router.get('/:dbId', databaseController.getDatabase);
router.delete('/:dbId', databaseController.deleteDatabase);

router.post('/:dbId/link', databaseController.linkDatabase);
router.post('/:dbId/unlink', databaseController.unlinkDatabase);
router.post('/:dbId/restart', databaseController.restartDatabase);

router.get('/:dbId/metrics', databaseController.getMetrics);
router.post('/:dbId/backup', databaseController.triggerBackup);
router.get('/:dbId/backups', databaseController.listBackups);
router.post('/:dbId/backups/:backupId/restore', databaseController.restoreBackup);

export default router;
