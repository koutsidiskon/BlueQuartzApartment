import { Op } from 'sequelize';
import { BlockedDate } from '../models/BlockedDate.js';
import { Booking } from '../models/Booking.js';
import { MinimumStayDate } from '../models/MinimumStayDate.js';

function normalizeDateList(inputDates) {
  if (!Array.isArray(inputDates)) return [];

  const normalized = inputDates
    .map((date) => String(date || '').trim())
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));

  return Array.from(new Set(normalized)).sort();
}

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

export class CalendarController {

  // Returns the union of manually blocked dates and confirmed booking date ranges
  async getBlockedDates(_req, res) {
    try {
      const [blockedDates, bookings, minimumStayDates] = await Promise.all([
        BlockedDate.findAll({ attributes: ['date'] }),
        Booking.findAll({ attributes: ['checkIn', 'checkOut'] }),
        MinimumStayDate.findAll({ attributes: ['date', 'minStayNights'] })
      ]);

      const merged = new Set(blockedDates.map(entry => entry.date));
      const checkInDates = new Set();
      for (const booking of bookings) {
        const checkInStr = typeof booking.checkIn === 'string'
          ? booking.checkIn
          : booking.checkIn.toISOString().slice(0, 10);
        checkInDates.add(checkInStr);
        for (const date of generateDateRange(booking.checkIn, booking.checkOut)) {
          merged.add(date);
        }
      }

      return res.json({
        success: true,
        data: Array.from(merged).sort(),
        checkInDates: Array.from(checkInDates).sort(),
        minimumStayDates: minimumStayDates
          .map((entry) => ({ date: entry.date, minStayNights: entry.minStayNights }))
          .sort((left, right) => left.date.localeCompare(right.date))
      });
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch blocked dates.'
      });
    }
  }

  // this method is used by the admin panel to update the list of blocked dates in the database based on the admin's input in the calendar UI
  async updateBlockedDates(req, res) {
    try {
      const dates = normalizeDateList(req.body?.dates);
      const blocked = !!req.body?.blocked;

      if (!dates.length) {
        return res.status(400).json({
          success: false,
          message: 'At least one valid date is required.'
        });
      }

      if (blocked) {
        await BlockedDate.bulkCreate(
          dates.map((date) => ({ date })),
          { ignoreDuplicates: true }
        );
      } else {
        await BlockedDate.destroy({
          where: { date: { [Op.in]: dates } }
        });
      }

      const blockedDates = await BlockedDate.findAll({
        attributes: ['date'],
        order: [['date', 'ASC']]
      });

      return res.json({
        success: true,
        data: blockedDates.map((entry) => entry.date)
      });
    } catch (error) {
      console.error('Error updating blocked dates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update blocked dates.'
      });
    }
  }

  async updateMinimumStayDates(req, res) {
    try {
      const dates = normalizeDateList(req.body?.dates);
      const minStayNights = Number.parseInt(String(req.body?.minStayNights || ''), 10);

      if (!dates.length) {
        return res.status(400).json({
          success: false,
          message: 'At least one valid date is required.'
        });
      }

      if (!Number.isInteger(minStayNights) || minStayNights < 1 || minStayNights > 30) {
        return res.status(400).json({
          success: false,
          message: 'Minimum stay must be a whole number between 1 and 30 nights.'
        });
      }

      const conflictCount = await BlockedDate.count({
        where: { date: { [Op.in]: dates } }
      });

      if (conflictCount > 0) {
        return res.status(409).json({
          success: false,
          message: 'Selected dates must be free before assigning a minimum stay rule.',
          conflictCount
        });
      }

      if (minStayNights === 5) {
        await MinimumStayDate.destroy({
          where: { date: { [Op.in]: dates } }
        });
      } else {
        await MinimumStayDate.bulkCreate(
          dates.map((date) => ({ date, minStayNights })),
          { updateOnDuplicate: ['minStayNights'] }
        );
      }

      const minimumStayDates = await MinimumStayDate.findAll({
        attributes: ['date', 'minStayNights'],
        order: [['date', 'ASC']]
      });

      return res.json({
        success: true,
        data: minimumStayDates.map((entry) => ({
          date: entry.date,
          minStayNights: entry.minStayNights
        }))
      });
    } catch (error) {
      console.error('Error updating minimum stay dates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update minimum stay dates.'
      });
    }
  }
}

export const calendarController = new CalendarController();
