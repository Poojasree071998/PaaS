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
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);

router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, authController.updateProfile);

router.post('/me/2fa/enable', authenticate, authController.enable2FA);
router.post('/me/2fa/verify', authenticate, authController.verify2FA);
router.post('/me/2fa/disable', authenticate, authController.disable2FA);

router.get('/oauth/github', authController.githubOAuth);
router.get('/oauth/github/callback', authController.githubOAuthCallback);
router.get('/oauth/gitlab', authController.gitlabOAuth);
router.get('/oauth/gitlab/callback', authController.gitlabOAuthCallback);

export default router;
