import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const BOOKING_COLORS = [
  '#3B82F6', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#081cb2', '#7a8c08', '#d50c66'
];

export const Booking = sequelize.define('Booking', {
  guestName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  guestEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true }
  },
  guestPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guestPhoneCountryCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  checkIn: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  checkOut: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  guestCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    validate: { min: 1 }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  source: {
    type: DataTypes.ENUM('Website', 'Booking', 'Airbnb', 'Email', 'WhatsApp', 'Other'),
    defaultValue: 'Website',
    allowNull: false
  },
  inquiryId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#3B82F6'
  }
});

export default Booking;
