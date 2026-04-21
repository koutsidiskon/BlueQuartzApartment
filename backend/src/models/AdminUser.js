import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const AdminUser = sequelize.define('AdminUser', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    set(value) {
      this.setDataValue('email', String(value || '').trim().toLowerCase());
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('owner', 'family'),
    allowNull: false,
    defaultValue: 'family'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

export default AdminUser;
