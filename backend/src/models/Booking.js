import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Booking = sequelize.define('Booking', {
    guest_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    guest_email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true }
    },
    check_in: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    check_out: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
        defaultValue: 'pending'
    }
});