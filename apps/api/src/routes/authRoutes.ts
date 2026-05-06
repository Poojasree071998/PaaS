import { Router } from 'express';
import * as authController from '../controllers/authController';
import { validateBody } from '../middlewares/validateBody';
import { registerSchema, loginSchema, refreshSchema } from '../validators/authValidator';
import { authenticate } from '../middlewares/authenticate';
import { authRateLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshSchema), authController.refresh);
router.get('/me', authenticate, authController.getMe);

export default router;
