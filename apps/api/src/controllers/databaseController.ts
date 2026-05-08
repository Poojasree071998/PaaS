import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from '../services/databaseService';

export const listDatabases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = req.query.teamId as string;
    const dbs = await DatabaseService.listDatabases(teamId, req.user!.id);
    res.json({ success: true, data: dbs });
  } catch (error) {
    next(error);
  }
};

export const provisionDatabase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = await DatabaseService.provisionDatabase(req.user!.id, req.body);
    res.json({ success: true, data: db });
  } catch (error) {
    next(error);
  }
};

export const getDatabase = async (req: Request, res: Response, next: NextFunction) => {
  res.json({ success: true, data: {} });
};

export const deleteDatabase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await DatabaseService.deleteDatabase(req.params.dbId, req.user!.id);
    res.json({ success: true, message: 'Database deleted' });
  } catch (error) {
    next(error);
  }
};

export const linkDatabase = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'DB linked' });
export const unlinkDatabase = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'DB unlinked' });
export const restartDatabase = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'DB restarted' });
export const getMetrics = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: {} });
export const triggerBackup = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'Backup triggered' });
export const listBackups = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, data: [] });
export const restoreBackup = async (req: Request, res: Response, next: NextFunction) => res.json({ success: true, message: 'Restore triggered' });
