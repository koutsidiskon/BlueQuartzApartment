import { Op } from 'sequelize';
import { BlockedDate } from '../models/BlockedDate.js';

function normalizeDateList(inputDates) {
  if (!Array.isArray(inputDates)) return [];

  const normalized = inputDates
    .map((date) => String(date || '').trim())
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));

  return Array.from(new Set(normalized)).sort();
}

export class CalendarController {
  async getBlockedDates(_req, res) {
    try {
      const blockedDates = await BlockedDate.findAll({
        attributes: ['date'],
        order: [['date', 'ASC']]
      });

      return res.json({
        success: true,
        data: blockedDates.map((entry) => entry.date)
      });
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch blocked dates.'
      });
    }
  }

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
