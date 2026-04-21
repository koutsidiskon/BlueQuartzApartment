import { Op } from 'sequelize';
import { Inquiry } from '../models/Inquiry.js';
import { BlockedDate } from '../models/BlockedDate.js';
import { sendInquiryConfirmation } from '../services/emailService.js';

export class InquiryController {
  
    // this method is used by the public inquiry form to create a new inquiry entry in the database based on the user's input in the form
    // it also performs validation on the input data recaptcha and honeypot, checks for blocked dates and sends a confirmation email to the user after successfully saving the inquiry
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
          // Verify the reCAPTCHA token with Google's API
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

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
          return res.status(400).json({
          success: false,
          message: 'Invalid check-in/check-out date range.'
          });
        }

        const conflictingBlockedDate = await BlockedDate.findOne({
          where: {
          date: {
            [Op.gte]: checkIn,
            [Op.lt]: checkOut
          }
          }
        });

        if (conflictingBlockedDate) {
          return res.status(400).json({
          success: false,
          message: 'Selected dates include unavailable days. Please choose another range.'
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

        sendInquiryConfirmation({ fullName, email, checkIn, checkOut, guests: guests || 1, message })
          .catch(err => console.error('Confirmation email failed:', err));

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

    // this method is used by the admin panel to fetch all inquiries from the database in order to display them in the inquiry management UI, 
    // with support for pagination, searching and sorting
    async getAllInquiries(req, res) {
        try {
      const requestedPage = Number.parseInt(String(req.query?.page || '1'), 10);
      const requestedPageSize = Number.parseInt(String(req.query?.pageSize || '10'), 10);

      const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
      const pageSizeRaw = Number.isFinite(requestedPageSize) && requestedPageSize > 0 ? requestedPageSize : 10;
      const pageSize = Math.min(pageSizeRaw, 100);
      const offset = (page - 1) * pageSize;

      const search = String(req.query?.search || '').trim().slice(0, 100);
      const allowedSortFields = ['createdAt', 'fullName', 'email', 'checkIn', 'checkOut', 'guests'];
      const sortField = allowedSortFields.includes(req.query?.sortField) ? req.query.sortField : 'createdAt';
      const sortDir = req.query?.sortDir === 'ASC' ? 'ASC' : 'DESC';

      const where = {};
      if (search) {
        where[Op.or] = [
          { email: { [Op.like]: `%${search}%` } },
          { fullName: { [Op.like]: `%${search}%` } }
        ];
      }

      const result = await Inquiry.findAndCountAll({
        where,
        order: [[sortField, sortDir]],
        limit: pageSize,
        offset
      });

      const totalItems = Number(result.count || 0);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

      return res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages
        }
      });
        } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
        }
    }

    // this method is used by the admin panel to delete one or more inquiries from the database based on the admin's selection in the inquiry management UI
    async deleteInquiries(req, res) {
      try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Please provide an array of inquiry IDs to delete.'
          });
        }

        const validIds = ids
          .map(id => Number(id))
          .filter(id => Number.isInteger(id) && id > 0);

        if (validIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No valid inquiry IDs provided.'
          });
        }

        const deletedCount = await Inquiry.destroy({
          where: { id: { [Op.in]: validIds } }
        });

        return res.json({
          success: true,
          message: `${deletedCount} inquiry(ies) deleted successfully.`,
          data: { deletedCount }
        });
      } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }
}

export const inquiryController = new InquiryController();