const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const packageRoutes = require('./routes/packageRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const supportRoutes = require('./routes/supportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const systemRoutes = require('./routes/systemRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const contactRoutes = require('./routes/contactRoutes');
const menuRoutes = require('./routes/menuRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Body parser
app.use(express.json());

// Enable CORS with specific origin for production
const allowedOrigins = [
    'https://tablereservation1.netlify.app',
    'http://localhost:5173',
];
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Set security headers
app.use(helmet({
    crossOriginResourcePolicy: false, // allow serving images
}));

// Serve static files from the uploads directory
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/packages', packageRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/restaurants', timeSlotRoutes); // GET /api/v1/restaurants/:id/slots
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);

// Direct menu route as requested by frontend
const { getMenu } = require('./controllers/restaurantController');
app.get('/api/v1/menu/:restaurantId', getMenu);

app.get('/', (req, res) => {
    res.send('Restaurant Platform API is running...');
});

// Global Error Handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
