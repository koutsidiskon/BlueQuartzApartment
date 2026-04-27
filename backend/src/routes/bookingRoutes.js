import express from 'express';
import { bookingController } from '../controllers/bookingController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', requireAdminAuth, (req, res) => bookingController.getAllBookings(req, res));
router.get('/calendar', requireAdminAuth, (req, res) => bookingController.getAllBookingsForCalendar(req, res));
router.post('/', requireAdminAuth, (req, res) => bookingController.createBooking(req, res));
router.post('/from-inquiry/:id', requireAdminAuth, (req, res) => bookingController.createFromInquiry(req, res));
router.put('/:id', requireAdminAuth, (req, res) => bookingController.updateBooking(req, res));
router.delete('/:id', requireAdminAuth, (req, res) => bookingController.deleteBooking(req, res));

export default router;
