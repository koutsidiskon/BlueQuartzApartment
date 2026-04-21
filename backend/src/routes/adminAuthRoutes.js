import express from 'express';
import rateLimit from 'express-rate-limit';
import { adminAuthController } from '../controllers/adminAuthController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

router.post('/login', loginLimiter, (req, res) => adminAuthController.login(req, res));
router.post('/logout', requireAdminAuth, (req, res) => adminAuthController.logout(req, res));
router.get('/me', requireAdminAuth, (req, res) => adminAuthController.me(req, res));

export default router;
