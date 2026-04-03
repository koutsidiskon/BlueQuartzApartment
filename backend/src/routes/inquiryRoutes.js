import express from 'express';
import { inquiryController } from '../controllers/inquiryController.js';

const router = express.Router();

router.get('/', inquiryController.getAllInquiries);
router.post('/', (req, res) => inquiryController.createInquiry(req, res));


export default router;