import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Image = sequelize.define('Image', {
    url: {
        type: DataTypes.TEXT, 
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'general',
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    caption: {
        type: DataTypes.STRING,
        allowNull: true,
    }
});

export default Image;