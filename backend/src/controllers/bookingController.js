import { Op } from 'sequelize';
import { Booking, BOOKING_COLORS } from '../models/Booking.js';
import { BlockedDate } from '../models/BlockedDate.js';
import { Inquiry } from '../models/Inquiry.js';

function escapeIcal(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldIcalLine(line) {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;
  const chars = [...line];
  const result = [];
  let current = '';
  for (const ch of chars) {
    if (Buffer.byteLength(current + ch, 'utf8') > 75) {
      result.push(current);
      current = ' ' + ch;
    } else {
      current += ch;
    }
  }
  if (current) result.push(current);
  return result.join('\r\n');
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

async function pickColor() {
  const count = await Booking.count();
  return BOOKING_COLORS[count % BOOKING_COLORS.length];
}

function validateDates(checkIn, checkOut) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  return !Number.isNaN(ci.getTime()) && !Number.isNaN(co.getTime()) && co > ci;
}

function normalizeMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount.toFixed(2) : '0.00';
}

function toDateOnly(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
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
      const selectedYear = Number.parseInt(String(req.query?.year || ''), 10);

      const where = {};
      if (Number.isInteger(selectedYear) && selectedYear >= 2000 && selectedYear <= 2100) {
        where.checkIn = { [Op.gte]: `${selectedYear}-01-01`, [Op.lt]: `${selectedYear + 1}-01-01` };
      }
      if (search) {
        where[Op.or] = [
          { guestName: { [Op.like]: `%${search}%` } },
          { guestEmail: { [Op.like]: `%${search}%` } }
        ];
      }

      const directWhere = { ...where, source: { [Op.ne]: 'Booking' } };
      const platformWhere = { ...where, source: 'Booking' };
      const [result, totals, directTotal, platformTotals] = await Promise.all([
        Booking.findAndCountAll({ where, order: [[sortField, sortDir]], limit: pageSize, offset }),
        Promise.all(['totalAmount', 'commissionAmount', 'environmentalTaxAmount', 'bankTransferAmount', 'bankFeeAmount', 'cashDepositAmount']
          .map((field) => Booking.sum(field, { where }))),
        Booking.sum('totalAmount', { where: directWhere }),
        Promise.all(['totalAmount', 'commissionAmount', 'environmentalTaxAmount', 'bankFeeAmount']
          .map((field) => Booking.sum(field, { where: platformWhere })))
      ]);
      const totalItems = Number(result.count || 0);
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const [totalAmount, commissionAmount, environmentalTaxAmount, bankTransferAmount, bankFeeAmount, cashDepositAmount] = totals.map((value) => Number(value || 0));
      const directRevenue = Number(directTotal || 0);
      const [bookingRevenue, bookingCommission, bookingEnvironmentalTax, bookingBankFee] = platformTotals.map((value) => Number(value || 0));
      const bookingNetProfit = bookingRevenue - bookingCommission - bookingEnvironmentalTax - bookingBankFee;
      const totalProfit = directRevenue + bookingNetProfit;

      return res.json({
        success: true,
        data: result.rows,
        pagination: { page, pageSize, totalItems, totalPages },
        financialSummary: {
          totalAmount,
          commissionAmount,
          environmentalTaxAmount,
          bankTransferAmount,
          bankFeeAmount,
          cashDepositAmount,
          cashRemainingAmount: Math.max(0, directRevenue - cashDepositAmount),
          cashRevenue: directRevenue,
          bookingRevenue,
          bookingNetProfit,
          bookingFees: bookingCommission + bookingBankFee,
          totalProfit,
          turnover: totalAmount,
          netWorth: totalProfit,
          netProfit: totalProfit
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStatistics(_req, res) {
    try {
      const bookings = await Booking.findAll({
        attributes: ['checkIn', 'checkOut', 'source', 'totalAmount', 'commissionAmount', 'environmentalTaxAmount', 'bankFeeAmount'],
        order: [['checkIn', 'ASC']]
      });
      const byYear = new Map();
      for (const booking of bookings) {
        const checkIn = toDateOnly(booking.checkIn);
        const checkOut = toDateOnly(booking.checkOut);
        const year = Number.parseInt(checkIn.slice(0, 4), 10);
        if (!Number.isInteger(year)) continue;
        const checkInTime = Date.parse(`${checkIn}T00:00:00Z`);
        const checkOutTime = Date.parse(`${checkOut}T00:00:00Z`);
        const nights = Number.isFinite(checkInTime) && Number.isFinite(checkOutTime) && checkOutTime > checkInTime
          ? Math.round((checkOutTime - checkInTime) / 86400000)
          : 0;
        const current = byYear.get(year) || { year, bookings: 0, nights: 0, turnover: 0, cashRevenue: 0, bookingNetProfit: 0, bookingFees: 0, environmentalFees: 0, totalProfit: 0 };
        const total = Number(booking.totalAmount || 0);
        const commission = Number(booking.commissionAmount || 0);
        const environmental = Number(booking.environmentalTaxAmount || 0);
        const bankFee = Number(booking.bankFeeAmount || 0);
        const bookingProfit = total - commission - environmental - bankFee;
        current.bookings += 1;
        current.nights += nights;
        current.turnover += total;
        current.environmentalFees += environmental;
        if (booking.source === 'Booking') {
          current.bookingNetProfit += bookingProfit;
          current.bookingFees += commission + bankFee;
        } else {
          current.cashRevenue += total;
        }
        current.totalProfit = current.cashRevenue + current.bookingNetProfit;
        byYear.set(year, current);
      }
      return res.json({ success: true, data: Array.from(byYear.values()).sort((a, b) => a.year - b.year) });
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
      const { guestName, guestEmail, guestPhone, guestPhoneCountryCode, checkIn, checkOut, guestCount, notes, source, inquiryId, force, totalAmount, commissionAmount, environmentalTaxAmount, bankTransferAmount, bankFeeAmount, cashDepositAmount } = req.body;

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
        totalAmount: normalizeMoney(totalAmount),
        commissionAmount: normalizeMoney(commissionAmount),
        environmentalTaxAmount: normalizeMoney(environmentalTaxAmount),
        bankTransferAmount: normalizeMoney(bankTransferAmount),
        bankFeeAmount: normalizeMoney(bankFeeAmount),
        cashDepositAmount: normalizeMoney(cashDepositAmount),
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

      const { guestPhone, guestPhoneCountryCode, notes, force, totalAmount, commissionAmount, environmentalTaxAmount, bankTransferAmount, bankFeeAmount, cashDepositAmount } = req.body;
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
        totalAmount: normalizeMoney(totalAmount),
        commissionAmount: normalizeMoney(commissionAmount),
        environmentalTaxAmount: normalizeMoney(environmentalTaxAmount),
        bankTransferAmount: normalizeMoney(bankTransferAmount),
        bankFeeAmount: normalizeMoney(bankFeeAmount),
        cashDepositAmount: normalizeMoney(cashDepositAmount),
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

      const { guestName, guestEmail, guestPhone, guestPhoneCountryCode, checkIn, checkOut, guestCount, notes, source, force, totalAmount, commissionAmount, environmentalTaxAmount, bankTransferAmount, bankFeeAmount, cashDepositAmount } = req.body;

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
        source: source || booking.source,
        totalAmount: totalAmount !== undefined ? normalizeMoney(totalAmount) : booking.totalAmount,
        commissionAmount: commissionAmount !== undefined ? normalizeMoney(commissionAmount) : booking.commissionAmount,
        environmentalTaxAmount: environmentalTaxAmount !== undefined ? normalizeMoney(environmentalTaxAmount) : booking.environmentalTaxAmount,
        bankTransferAmount: bankTransferAmount !== undefined ? normalizeMoney(bankTransferAmount) : booking.bankTransferAmount
        ,bankFeeAmount: bankFeeAmount !== undefined ? normalizeMoney(bankFeeAmount) : booking.bankFeeAmount
        ,cashDepositAmount: cashDepositAmount !== undefined ? normalizeMoney(cashDepositAmount) : booking.cashDepositAmount
      });

      return res.json({ success: true, data: booking });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  async getIcalUrl(req, res) {
    const secret = process.env.ICAL_SECRET;
    if (!secret) {
      return res.status(503).json({ success: false, message: 'iCal feed not configured. Set ICAL_SECRET in environment.' });
    }
    const corsOrigin = (process.env.CORS_ORIGINS || '').split(',')[0].trim();
    const baseUrl = corsOrigin || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/api/bookings/ical?token=${encodeURIComponent(secret)}`;
    return res.json({ success: true, url });
  }

  async getIcal(req, res) {
    const secret = process.env.ICAL_SECRET;
    if (!secret || req.query.token !== secret) {
      return res.status(401).send('Unauthorized');
    }

    try {
      const bookings = await Booking.findAll({
        attributes: [
          'id', 'guestName', 'guestEmail', 'guestPhone', 'guestPhoneCountryCode',
          'checkIn', 'checkOut', 'guestCount', 'source', 'notes', 'totalAmount',
          'commissionAmount', 'environmentalTaxAmount', 'bankFeeAmount', 'cashDepositAmount'
        ],
        order: [['checkIn', 'ASC']]
      });

      const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

      const events = bookings.map(b => {
        const dtstart = String(b.checkIn).replace(/-/g, '');
        const dtend = String(b.checkOut).replace(/-/g, '');
        const guests = b.guestCount;
        const summary = `${b.guestName} (${guests} guest${guests !== 1 ? 's' : ''})`;
        const totalAmount = Number(b.totalAmount || 0);
        const commissionAmount = Number(b.commissionAmount || 0);
        const environmentalTaxAmount = Number(b.environmentalTaxAmount || 0);
        const bankFeeAmount = Number(b.bankFeeAmount || 0);
        const cashDepositAmount = Number(b.cashDepositAmount || 0);
        const bookingNetProfit = totalAmount - commissionAmount - environmentalTaxAmount - bankFeeAmount;
        const cashRemainingAmount = Math.max(0, totalAmount - cashDepositAmount);
        const money = (amount) => `${amount.toFixed(2)} EUR`;

        const lines = [];
        lines.push(`👤 ${b.guestName}`);
        if (b.guestEmail) lines.push(`✉ ${b.guestEmail}`);
        if (b.guestPhone) {
          const phone = b.guestPhoneCountryCode
            ? `${b.guestPhoneCountryCode} ${b.guestPhone}`
            : b.guestPhone;
          lines.push(`📞 ${phone}`);
        }
        lines.push(`👥 ${guests} guest${guests !== 1 ? 's' : ''}`);
        if (b.source) lines.push(`🔖 ${b.source}`);
        lines.push('');
        lines.push(`💶 Total amount: ${money(totalAmount)}`);
        if (b.source === 'Booking') {
          lines.push(`💳 Platform commission: ${money(commissionAmount)}`);
          lines.push(`🌿 Environmental fees: ${money(environmentalTaxAmount)}`);
          lines.push(`🏦 Bank fees: ${money(bankFeeAmount)}`);
          lines.push(`✅ Booking net profit: ${money(bookingNetProfit)}`);
        } else {
          lines.push(`💵 Cash deposit: ${money(cashDepositAmount)}`);
          lines.push(`📌 Cash remaining: ${money(cashRemainingAmount)}`);
        }
        if (b.notes) {
          lines.push('');
          lines.push(`📝 ${b.notes}`);
        }

        return [
          'BEGIN:VEVENT',
          `UID:booking-${b.id}@bluequartz-apartment`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART;VALUE=DATE:${dtstart}`,
          `DTEND;VALUE=DATE:${dtend}`,
          foldIcalLine(`SUMMARY:${escapeIcal(summary)}`),
          foldIcalLine(`DESCRIPTION:${escapeIcal(lines.join('\n'))}`),
          `LOCATION:${escapeIcal('Blue Quartz Apartment, Limenas, Thassos, Greece')}`,
          'END:VEVENT'
        ].join('\r\n');
      });

      const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BlueQuartz Apartment//Bookings//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:BlueQuartz Bookings',
        'X-WR-TIMEZONE:Europe/Athens',
        ...events,
        'END:VCALENDAR'
      ].join('\r\n');

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return res.send(ical);
    } catch (error) {
      return res.status(500).send('Internal Server Error');
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
