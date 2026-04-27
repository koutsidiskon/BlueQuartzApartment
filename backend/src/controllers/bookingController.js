import { Op } from 'sequelize';
import { Booking, BOOKING_COLORS } from '../models/Booking.js';
import { BlockedDate } from '../models/BlockedDate.js';
import { Inquiry } from '../models/Inquiry.js';

function generateDateRange(checkIn, checkOut) {
  const dates = [];
  const end = new Date(checkOut);
  for (let d = new Date(checkIn); d < end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

async function pickColor() {
  const count = await Booking.count();
  return BOOKING_COLORS[count % BOOKING_COLORS.length];
}

function validateDates(checkIn, checkOut) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  return !Number.isNaN(ci.getTime()) && !Number.isNaN(co.getTime()) && co > ci;
}

export class BookingController {

  async getAllBookings(req, res) {
    try {
      const requestedPage = Number.parseInt(String(req.query?.page || '1'), 10);
      const requestedPageSize = Number.parseInt(String(req.query?.pageSize || '10'), 10);
      const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
      const pageSizeRaw = Number.isFinite(requestedPageSize) && requestedPageSize > 0 ? requestedPageSize : 10;
      const pageSize = Math.min(pageSizeRaw, 100);
      const offset = (page - 1) * pageSize;

      const search = String(req.query?.search || '').trim().slice(0, 100);
      const allowedSortFields = ['createdAt', 'guestName', 'guestEmail', 'checkIn', 'checkOut', 'guestCount', 'source'];
      const sortField = allowedSortFields.includes(req.query?.sortField) ? req.query.sortField : 'checkIn';
      const sortDir = req.query?.sortDir === 'ASC' ? 'ASC' : 'DESC';

      const where = {};
      if (search) {
        where[Op.or] = [
          { guestName: { [Op.like]: `%${search}%` } },
          { guestEmail: { [Op.like]: `%${search}%` } }
        ];
      }

      const result = await Booking.findAndCountAll({ where, order: [[sortField, sortDir]], limit: pageSize, offset });
      const totalItems = Number(result.count || 0);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

      return res.json({ success: true, data: result.rows, pagination: { page, pageSize, totalItems, totalPages } });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAllBookingsForCalendar(_req, res) {
    try {
      const bookings = await Booking.findAll({
        attributes: ['id', 'guestName', 'checkIn', 'checkOut', 'source', 'color'],
        order: [['checkIn', 'ASC']]
      });
      return res.json({ success: true, data: bookings });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async createBooking(req, res) {
    try {
      const { guestName, guestEmail, guestPhone, guestPhoneCountryCode, checkIn, checkOut, guestCount, notes, source, inquiryId, force } = req.body;

      if (!guestName || !guestEmail || !checkIn || !checkOut) {
        return res.status(400).json({ success: false, message: 'guestName, guestEmail, checkIn and checkOut are required.' });
      }

      if (!validateDates(checkIn, checkOut)) {
        return res.status(400).json({ success: false, message: 'Invalid date range. Check-out must be after check-in.' });
      }

      // Check for overlapping bookings
      const conflictingBooking = await Booking.findOne({
        where: { checkIn: { [Op.lt]: checkOut }, checkOut: { [Op.gt]: checkIn } }
      });
      if (conflictingBooking) {
        return res.status(409).json({
          success: false,
          conflictType: 'booking',
          message: `These dates conflict with an existing booking for ${conflictingBooking.guestName}.`,
          guestName: conflictingBooking.guestName,
          checkIn: conflictingBooking.checkIn,
          checkOut: conflictingBooking.checkOut
        });
      }

      // Check for manually blocked dates (skipped if force=true)
      if (!force) {
        const dates = generateDateRange(checkIn, checkOut);
        const blockedCount = await BlockedDate.count({ where: { date: { [Op.in]: dates } } });
        if (blockedCount > 0) {
          return res.status(409).json({
            success: false,
            conflictType: 'manual_block',
            message: `${blockedCount} date(s) in this range are already manually blocked.`,
            blockedCount
          });
        }
      }

      const color = await pickColor();
      const booking = await Booking.create({
        guestName: String(guestName).trim(),
        guestEmail: String(guestEmail).trim(),
        guestPhone: guestPhone ? String(guestPhone).trim() : null,
        guestPhoneCountryCode: guestPhoneCountryCode ? String(guestPhoneCountryCode).trim() : null,
        checkIn,
        checkOut,
        guestCount: Number(guestCount) || 1,
        notes: notes ? String(notes).trim() : null,
        source: source || 'Website',
        inquiryId: inquiryId || null,
        color
      });

      const dates = generateDateRange(checkIn, checkOut);
      if (dates.length) {
        await BlockedDate.bulkCreate(dates.map(date => ({ date })), { ignoreDuplicates: true });
      }

      return res.status(201).json({ success: true, data: booking });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async createFromInquiry(req, res) {
    try {
      const inquiryId = Number(req.params.id);
      if (!Number.isInteger(inquiryId) || inquiryId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid inquiry ID.' });
      }

      const inquiry = await Inquiry.findByPk(inquiryId);
      if (!inquiry) {
        return res.status(404).json({ success: false, message: 'Inquiry not found.' });
      }

      const { guestPhone, guestPhoneCountryCode, notes, force } = req.body;
      const { checkIn, checkOut } = inquiry;

      // Check for overlapping bookings
      const conflictingBooking = await Booking.findOne({
        where: { checkIn: { [Op.lt]: checkOut }, checkOut: { [Op.gt]: checkIn } }
      });
      if (conflictingBooking) {
        return res.status(409).json({
          success: false,
          conflictType: 'booking',
          message: `These dates conflict with an existing booking for ${conflictingBooking.guestName}.`,
          guestName: conflictingBooking.guestName,
          checkIn: conflictingBooking.checkIn,
          checkOut: conflictingBooking.checkOut
        });
      }

      // Check for manually blocked dates (skipped if force=true)
      if (!force) {
        const dates = generateDateRange(checkIn, checkOut);
        const blockedCount = await BlockedDate.count({ where: { date: { [Op.in]: dates } } });
        if (blockedCount > 0) {
          return res.status(409).json({
            success: false,
            conflictType: 'manual_block',
            message: `${blockedCount} date(s) in this range are already manually blocked.`,
            blockedCount
          });
        }
      }

      const color = await pickColor();
      const booking = await Booking.create({
        guestName: inquiry.fullName,
        guestEmail: inquiry.email,
        guestPhone: guestPhone ? String(guestPhone).trim() : (inquiry.phone || null),
        guestPhoneCountryCode: guestPhoneCountryCode ? String(guestPhoneCountryCode).trim() : (inquiry.phoneCountryCode || null),
        checkIn,
        checkOut,
        guestCount: inquiry.guests,
        notes: notes ? String(notes).trim() : null,
        source: 'Website',
        inquiryId,
        color
      });

      const dates = generateDateRange(checkIn, checkOut);
      if (dates.length) {
        await BlockedDate.bulkCreate(dates.map(date => ({ date })), { ignoreDuplicates: true });
      }

      return res.status(201).json({ success: true, data: booking });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateBooking(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
      }

      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const { guestName, guestEmail, guestPhone, guestPhoneCountryCode, checkIn, checkOut, guestCount, notes, source, force } = req.body;

      const newCheckIn = checkIn || booking.checkIn;
      const newCheckOut = checkOut || booking.checkOut;

      if (!validateDates(newCheckIn, newCheckOut)) {
        return res.status(400).json({ success: false, message: 'Invalid date range.' });
      }

      // Update blocked dates only if dates changed
      if (newCheckIn !== booking.checkIn || newCheckOut !== booking.checkOut) {
        // Check for overlap with OTHER bookings
        const conflictingBooking = await Booking.findOne({
          where: {
            id: { [Op.ne]: id },
            checkIn: { [Op.lt]: newCheckOut },
            checkOut: { [Op.gt]: newCheckIn }
          }
        });
        if (conflictingBooking) {
          return res.status(409).json({
            success: false,
            conflictType: 'booking',
            message: `These dates conflict with an existing booking for ${conflictingBooking.guestName}.`,
            guestName: conflictingBooking.guestName,
            checkIn: conflictingBooking.checkIn,
            checkOut: conflictingBooking.checkOut
          });
        }

        const oldDates = generateDateRange(booking.checkIn, booking.checkOut);
        const newDates = generateDateRange(newCheckIn, newCheckOut);
        const toUnblock = oldDates.filter(d => !newDates.includes(d));
        const toBlock = newDates.filter(d => !oldDates.includes(d));

        // Check for manually blocked dates in the newly added range
        if (!force && toBlock.length) {
          const blockedCount = await BlockedDate.count({ where: { date: { [Op.in]: toBlock } } });
          if (blockedCount > 0) {
            return res.status(409).json({
              success: false,
              conflictType: 'manual_block',
              message: `${blockedCount} date(s) in the new range are already manually blocked.`,
              blockedCount
            });
          }
        }

        if (toUnblock.length) {
          await BlockedDate.destroy({ where: { date: { [Op.in]: toUnblock } } });
        }
        if (toBlock.length) {
          await BlockedDate.bulkCreate(toBlock.map(date => ({ date })), { ignoreDuplicates: true });
        }
      }

      await booking.update({
        guestName: guestName !== undefined ? String(guestName).trim() : booking.guestName,
        guestEmail: guestEmail !== undefined ? String(guestEmail).trim() : booking.guestEmail,
        guestPhone: guestPhone !== undefined ? (guestPhone ? String(guestPhone).trim() : null) : booking.guestPhone,
        guestPhoneCountryCode: guestPhoneCountryCode !== undefined ? (guestPhoneCountryCode ? String(guestPhoneCountryCode).trim() : null) : booking.guestPhoneCountryCode,
        checkIn: newCheckIn,
        checkOut: newCheckOut,
        guestCount: guestCount !== undefined ? (Number(guestCount) || 1) : booking.guestCount,
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : booking.notes,
        source: source || booking.source
      });

      return res.json({ success: true, data: booking });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async deleteBooking(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
      }

      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const dates = generateDateRange(booking.checkIn, booking.checkOut);
      if (dates.length) {
        await BlockedDate.destroy({ where: { date: { [Op.in]: dates } } });
      }

      await booking.destroy();
      return res.json({ success: true, message: 'Booking deleted and dates released.' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export const bookingController = new BookingController();
