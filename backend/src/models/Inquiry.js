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
  message: {
    type: DataTypes.TEXT, 
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false // Για να ξέρεις αν την είδες την ερώτηση στο μέλλον
  }
});

export default Inquiry;