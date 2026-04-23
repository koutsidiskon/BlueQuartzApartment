import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// This model represents the blocked dates for the apartment, which are stored in the database and used to prevent bookings on those dates.
export const BlockedDate = sequelize.define('BlockedDate', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: 'blocked_date_unique'
  }
}, {
  indexes: [
    { unique: true, fields: ['date'], name: 'blocked_date_unique' }
  ]
});

export default BlockedDate;
