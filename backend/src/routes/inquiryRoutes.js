import express from 'express';
import rateLimit from 'express-rate-limit';
import { inquiryController } from '../controllers/inquiryController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

const inquiryLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: 'Too many booking requests from this IP. Please try again in 15 minutes.'
	}
});

router.get('/', requireAdminAuth, inquiryController.getAllInquiries);
router.post('/', inquiryLimiter, (req, res) => inquiryController.createInquiry(req, res));


export default router;