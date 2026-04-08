import { Inquiry } from '../models/Inquiry.js';

export class InquiryController {
  
  
    async createInquiry(req, res) {
        try {
        const { fullName, email, checkIn, checkOut, message, guests, botField, recaptchaToken } = req.body;

        const recaptchaSecret = process.env.RECAPTCHA_SECRET;
        if (recaptchaSecret) {
          if (!recaptchaToken) {
            return res.status(400).json({
              success: false,
              message: 'reCAPTCHA token missing'
            });
          }

          const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(recaptchaToken)}`;
          const verifyResponse = await fetch(verifyUrl, { method: 'POST' });
          const verifyData = await verifyResponse.json();
          const scoreThreshold = parseFloat(process.env.RECAPTCHA_THRESHOLD || '0.5');

          if (!verifyData.success || verifyData.action !== 'inquiry' || verifyData.score < scoreThreshold) {
            return res.status(400).json({
              success: false,
              message: 'reCAPTCHA verification failed'
            });
          }
        }

        // Honeypot check: real users never fill this hidden field.
        if (typeof botField === 'string' && botField.trim().length > 0) {
            return res.status(400).json({
            success: false,
            message: 'Invalid request'
            });
        }

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
            message,
            guests: guests || 1
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