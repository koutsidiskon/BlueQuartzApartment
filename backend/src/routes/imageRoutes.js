import express from 'express';
import { imageController } from '../controllers/imageController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/', imageController.getImages);
router.post('/', requireAdminAuth, (req, res) => imageController.createImage(req, res));


export default router;