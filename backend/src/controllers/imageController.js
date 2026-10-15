import { Image } from '../models/Image.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'images');

export class ImageController {
    
    // This method is used by the public gallery page to fetch all images from the database in order to display them in the gallery UI
    async getImages(req, res) {
        try {
            // Το await χρειάζεται την async από πάνω
            const images = await Image.findAll();
            res.json(images);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    
    // This method is used by the admin panel to create a new image entry in the database based on the admin's input in the gallery management UI
    // Not implemented yet, but it will be used to add new images to the gallery by providing the image URL, category, sort order and caption through a form in the admin panel
    async createImage(req, res) {
        try {
            const imageData = this.validateImageData(req.body);
            const newImage = await Image.create(imageData);
            res.status(201).json(newImage);
        } catch (error) {
            res.status(error.statusCode || 500).json({ message: error.message });
        }
    }

    async updateImage(req, res) {
        try {
            const image = await Image.findByPk(req.params.id);
            if (!image) return res.status(404).json({ message: 'Image not found.' });

            await image.update(this.validateImageData(req.body, { allowRelativeUrl: true }));
            return res.json(image);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ message: error.message });
        }
    }

    async deleteImage(req, res) {
        try {
            const image = await Image.findByPk(req.params.id);
            if (!image) return res.status(404).json({ message: 'Image not found.' });

            await image.destroy();
            if (image.url.startsWith('uploads/images/')) {
                await fs.rm(path.resolve(process.cwd(), image.url), { force: true });
            }
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    async uploadImage(req, res) {
        try {
            if (!req.file) return res.status(400).json({ message: 'An image file is required.' });

            const imageData = this.validateImageData(req.body, { allowRelativeUrl: true, allowEmptyUrl: true });
            const category = imageData.category;
            const categoryDirectory = path.join(UPLOAD_ROOT, category);
            await fs.mkdir(categoryDirectory, { recursive: true });

            const extension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
            const filename = `${randomUUID()}${extension}`;
            const filePath = path.join(categoryDirectory, filename);
            await fs.writeFile(filePath, req.file.buffer);

            const image = await Image.create({
                ...imageData,
                url: `uploads/images/${category}/${filename}`
            });
            return res.status(201).json(image);
        } catch (error) {
            return res.status(error.statusCode || 500).json({ message: error.message });
        }
    }

    validateImageData(body = {}, options = {}) {
        const url = typeof body.url === 'string' ? body.url.trim() : '';
        const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : '';

        const isUploadedPath = /^uploads\/images\/[\w./% -]+$/i.test(url);
        const isAbsoluteUrl = /^https?:\/\//i.test(url);
        if ((!url && !options.allowEmptyUrl) || (url && !isAbsoluteUrl && !(options.allowRelativeUrl && isUploadedPath))) {
            const error = new Error('A valid image URL is required.');
            error.statusCode = 400;
            throw error;
        }
        if (!category) {
            const error = new Error('A category is required.');
            error.statusCode = 400;
            throw error;
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category) || category.length > 50) {
            const error = new Error('Category must contain only lowercase letters, numbers and hyphens.');
            error.statusCode = 400;
            throw error;
        }

        return {
            url,
            category,
            sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
            caption: typeof body.caption === 'string' ? body.caption.trim() : null
        };
    }
    

}

export const imageController = new ImageController();