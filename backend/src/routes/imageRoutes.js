import express from 'express';
import { imageController } from '../controllers/imageController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => {
		callback(null, file.mimetype.startsWith('image/'));
	}
});

// Image routes for managing apartment images in the admin panel
router.get('/', imageController.getImages);
router.post('/', requireAdminAuth, (req, res) => imageController.createImage(req, res));
router.post('/upload', requireAdminAuth, upload.single('file'), (req, res) => imageController.uploadImage(req, res));
router.put('/:id', requireAdminAuth, (req, res) => imageController.updateImage(req, res));
router.delete('/:id', requireAdminAuth, (req, res) => imageController.deleteImage(req, res));


export default router;