import { Inquiry } from '../models/Inquiry.js';

export class InquiryController {
  
  
    async createInquiry(req, res) {
        try {
        const { fullName, email, checkIn, checkOut, message } = req.body;

        if (!fullName || !email || !checkIn || !checkOut) {
            return res.status(400).json({ 
            success: false, 
            message: "Please provide all required fields: fullName, email, checkIn, checkOut" 
            });
        }

        const newInquiry = await Inquiry.create({
            fullName,
            email,
            checkIn,
            checkOut,
            message
        });

        return res.status(201).json({
            success: true,
            message: 'Your inquiry has been saved successfully!',
            data: { id: newInquiry.id }
        });

        } catch (error) {
        console.error('Error in InquiryController:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error',
            error: error.message 
        });
        }
    }

  
    // Ανάκτηση όλων των ερωτήσεων για το admin panel
   
    async getAllInquiries(req, res) {
        try {
        const inquiries = await Inquiry.findAll({
            order: [['createdAt', 'DESC']]
        });
        return res.json({ success: true, data: inquiries });
        } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
        }
    }
}

export const inquiryController = new InquiryController();