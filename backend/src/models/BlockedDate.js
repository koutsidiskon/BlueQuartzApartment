import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const BlockedDate = sequelize.define('BlockedDate', {
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true
  }
});

export default BlockedDate;
