import express from 'express';
import rateLimit from 'express-rate-limit';
import { inquiryController } from '../controllers/inquiryController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Rate limiter for inquiry submissions to prevent spam and abuse of the contact form
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

// Inquiry routes for handling contact form submissions and managing inquiries in the admin panel
router.get('/', requireAdminAuth, (req, res) => inquiryController.getAllInquiries(req, res));
router.post('/', inquiryLimiter, (req, res) => inquiryController.createInquiry(req, res));
router.delete('/', requireAdminAuth, (req, res) => inquiryController.deleteInquiries(req, res));


export default router;