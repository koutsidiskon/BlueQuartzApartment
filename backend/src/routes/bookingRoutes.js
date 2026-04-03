import express from 'express';
import { bookingController } from '../controllers/bookingController.js';

const router = express.Router();

router.get('/', bookingController.getAllBookings);
router.get('/occupied', bookingController.getOccupiedDates);
router.post('/', bookingController.addBooking);
router.delete('/:id', bookingController.deleteBooking);

export default router;