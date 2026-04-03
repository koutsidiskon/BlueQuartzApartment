import { Image } from '../models/Image.js';

export class ImageController {
    
    async getImages(req, res) {
        try {
            // Το await χρειάζεται την async από πάνω
            const images = await Image.findAll();
            res.json(images);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async createImage(req, res) {
    try {
        // Παίρνουμε τα δεδομένα από το σώμα του αιτήματος (Request Body)
        const { url, category, sortOrder, caption } = req.body;
        
        const newImage = await Image.create({
            url,
            category,
            sortOrder,
            caption
        });
        
            res.status(201).json(newImage);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    

}

export const imageController = new ImageController();