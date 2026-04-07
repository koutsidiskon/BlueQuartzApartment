import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Inquiry = sequelize.define('Inquiry', {
  
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true }
  },
  checkIn: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  checkOut: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  guests: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: { min: 1, max: 4 }
  },
  message: {
    type: DataTypes.TEXT, 
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false 
  }
});

export default Inquiry;