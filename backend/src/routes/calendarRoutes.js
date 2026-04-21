import express from 'express';
import { calendarController } from '../controllers/calendarController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/blocked-dates', (req, res) => calendarController.getBlockedDates(req, res));
router.put('/blocked-dates', requireAdminAuth, (req, res) => calendarController.updateBlockedDates(req, res));

export default router;
