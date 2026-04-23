
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import sequelize from './src/config/db.js';
import imageRoutes from './src/routes/imageRoutes.js';
import inquiryRoutes from './src/routes/inquiryRoutes.js';
import calendarRoutes from './src/routes/calendarRoutes.js';
import adminAuthRoutes from './src/routes/adminAuthRoutes.js';
import { ensureInitialAdminUser } from './src/config/bootstrapAdmin.js';
import dotenv from 'dotenv';
dotenv.config();


const app = express();

app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:4200')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/calendar', calendarRoutes);

if (!process.env.RECAPTCHA_SECRET) {
    console.warn('⚠️ RECAPTCHA_SECRET is not set. reCAPTCHA verification is currently disabled.');
} else {
    console.log('✅ reCAPTCHA verification is enabled.');
}

if (process.env.RECAPTCHA_THRESHOLD && Number.isNaN(Number(process.env.RECAPTCHA_THRESHOLD))) {
    console.warn('⚠️ RECAPTCHA_THRESHOLD is not a valid number. Fallback 0.5 will be used.');
}

if (!process.env.ADMIN_JWT_SECRET) {
    console.warn('⚠️ ADMIN_JWT_SECRET is not set. Admin authentication endpoints will not work correctly.');
}



const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await sequelize.sync({ alter: true });
        console.log('✅ Database & tables synced!');

        // Ensure to create the initial admin user if it doesn't exist. This is important for being able to log in to the admin panel for the first time.
        // You can set and additional admin users later using different email and password and add them to .env as well, or you can create them directly in the database.
        // await ensureInitialAdminUser();

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Error starting server:', err);
        process.exit(1);
    }
}

startServer();