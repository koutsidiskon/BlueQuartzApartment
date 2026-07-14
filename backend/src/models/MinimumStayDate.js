import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const MinimumStayDate = sequelize.define('MinimumStayDate', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: 'minimum_stay_date_unique'
  },
  minStayNights: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
    validate: {
      min: 1,
      max: 30
    }
  }
}, {
  indexes: [
    { unique: true, fields: ['date'], name: 'minimum_stay_date_unique' }
  ]
});

export default MinimumStayDate;