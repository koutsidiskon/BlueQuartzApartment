
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

// Create a new Sequelize instance using environment variables for database connection details.
const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        dialect: 'mariadb',
        logging: false, 
    }
);

export default sequelize;