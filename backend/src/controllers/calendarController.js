import { Op } from 'sequelize';
import { BlockedDate } from '../models/BlockedDate.js';
import { Booking } from '../models/Booking.js';

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
      const [blockedDates, bookings] = await Promise.all([
        BlockedDate.findAll({ attributes: ['date'] }),
        Booking.findAll({ attributes: ['checkIn', 'checkOut'] })
      ]);

      const merged = new Set(blockedDates.map(entry => entry.date));
      for (const booking of bookings) {
        for (const date of generateDateRange(booking.checkIn, booking.checkOut)) {
          merged.add(date);
        }
      }

      return res.json({
        success: true,
        data: Array.from(merged).sort()
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
}

export const calendarController = new CalendarController();
