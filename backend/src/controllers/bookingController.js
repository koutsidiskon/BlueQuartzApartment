import { Booking } from '../models/Booking.js';
import { Op } from 'sequelize';

export class BookingController {

    constructor() {
        
        this.getAllBookings = this.getAllBookings.bind(this);
        this.addBooking = this.addBooking.bind(this);
        this.getOccupiedDates = this.getOccupiedDates.bind(this);
        this.deleteBooking = this.deleteBooking.bind(this);
    }
    
    // Λήψη όλων των κρατήσεων με σελιδοποίηση και αναζήτηση
    getAllBookings = async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const size = parseInt(req.query.limit) || 10;
            const limit = size;
            const offset = (page - 1) * size;
            const search = req.query.search || '';

            const whereClause = search ? { 
                guest_name: { [Op.like]: `%${search}%` } 
            } : {};
            
            const { count, rows } = await Booking.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [['id', 'DESC']]
            });

            res.json({ 
                bookings: rows, 
                totalBookings: count, 
                totalPages: Math.ceil(count / limit), 
                currentPage: page 
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to fetch bookings' });
        }
    };

    // Προσθήκη νέας κράτησης
    addBooking = async (req, res) => {
        const { guest_name, guest_email, check_in, check_out } = req.body;

        try {
            // Έλεγχος για Overlap (αν οι ημερομηνίες είναι πιασμένες)
            const overlappingBooking = await Booking.findOne({
                where: {
                    status: { [Op.not]: 'cancelled' },
                    [Op.and]: [
                        { check_in: { [Op.lt]: check_out } }, // Υπάρχουσα άφιξη < Νέα αναχώρηση
                        { check_out: { [Op.gt]: check_in } }  // Υπάρχουσα αναχώρηση > Νέα άφιξη
                    ]
                }
            });

            if (overlappingBooking) {
                return res.status(400).json({ 
                    error: 'Το κατάλυμα είναι ήδη κρατημένο για αυτές τις ημερομηνίες.' 
                });
            }

            const booking = await Booking.create({ guest_name, guest_email, check_in, check_out });
            res.status(201).json(booking);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to create booking' });
        }
    };

    // Endpoint για να παίρνει η Angular μόνο τις πιασμένες ημερομηνίες
    getOccupiedDates = async (req, res) => {
        try {
            const bookings = await Booking.findAll({
                attributes: ['check_in', 'check_out'],
                where: {
                    status: { [Op.not]: 'cancelled' }
                }
            });
            res.json(bookings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };

    deleteBooking = async (req, res) => {
        const { id } = req.params;
        try {
            const booking = await Booking.findByPk(id);
            if (!booking) return res.status(404).json({ error: 'Η κράτηση δεν βρέθηκε' });
            await booking.destroy();
            res.json({ message: 'Η κράτηση διαγράφηκε' });
        } catch (err) {
            res.status(500).json({ error: 'Αποτυχία διαγραφής' });
        }
    };
}

// Export ένα instance του controller
export const bookingController = new BookingController();