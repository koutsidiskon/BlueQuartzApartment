import express from 'express';
import { imageController } from '../controllers/imageController.js';

const router = express.Router();

router.get('/', imageController.getImages);
router.post('/', (req, res) => imageController.createImage(req, res));


export default router;