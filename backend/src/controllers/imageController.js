import { Image } from '../models/Image.js';

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