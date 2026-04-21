import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// This model represents the admin users who can log in to the admin panel and manage the website content and inquiries. 
// It includes fields for email, password hash, role (owner or family), active status and last login time. The email field is unique and validated to ensure it is in a proper email format. 
// The password is stored as a hash for security reasons.
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
