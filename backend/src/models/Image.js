import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// This model represents the images for the apartment, which are stored in the database and used to display them in the gallery page and other sections of the website.
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