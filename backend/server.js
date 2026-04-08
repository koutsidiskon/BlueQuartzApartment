
import express from 'express';
import cors from 'cors';
import sequelize from './src/config/db.js';
import imageRoutes from './src/routes/imageRoutes.js';
import inquiryRoutes from './src/routes/inquiryRoutes.js';
import dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/images', imageRoutes);
app.use('/api/inquiries', inquiryRoutes);

if (!process.env.RECAPTCHA_SECRET) {
    console.warn('⚠️ RECAPTCHA_SECRET is not set. reCAPTCHA verification is currently disabled.');
} else {
    console.log('✅ reCAPTCHA verification is enabled.');
}

if (process.env.RECAPTCHA_THRESHOLD && Number.isNaN(Number(process.env.RECAPTCHA_THRESHOLD))) {
    console.warn('⚠️ RECAPTCHA_THRESHOLD is not a valid number. Fallback 0.5 will be used.');
}



sequelize.sync({ alter: true })
    .then(() => console.log('✅ Database & tables synced!'))
    .catch(err => console.error('❌ Error syncing database:', err));
    


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});