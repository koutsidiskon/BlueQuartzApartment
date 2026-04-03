
import express from 'express';
import cors from 'cors';
import sequelize from './src/config/db.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import imageRoutes from './src/routes/imageRoutes.js';
import inquiryRoutes from './src/routes/inquiryRoutes.js';
import dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/bookings', bookingRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/inquiries', inquiryRoutes);



sequelize.sync({ alter: true })
    .then(() => console.log('✅ Database & tables synced!'))
    .catch(err => console.error('❌ Error syncing database:', err));
    


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});