const http = require('http');
const dotenv = require('dotenv');

// ── Load env vars FIRST ────────────────────────────────────────────────────────
dotenv.config();

// ── Startup self-heal validation ───────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET is not set in .env! Auth will fail for all users.');
}
if (!process.env.MONGO_URI) {
  console.error('[CRITICAL] MONGO_URI is not set in .env! Database connection will fail.');
}
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('[WARNING] Razorpay keys not set. Payment processing may fail.');
}

const connectDB = require('./src/config/db');
const app = require('./src/app');

// Connect to database
connectDB().then(() => {
  // ── Run self-healing after DB is ready ───────────────────────────────
  const performSelfHealing = require('./src/utils/selfHeal');
  performSelfHealing();
});

const server = http.createServer(app);

// Initialize Socket.io
const initSocket = require('./src/sockets/booking.socket');
initSocket(server, app);

// Initialize Cron Jobs
require('./src/cron/reservationCron');

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\u2705 Server running on port ${PORT}`);
  console.log(`\u2705 JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'MISSING \u26a0\ufe0f'}`);
  console.log(`\u2705 MONGO_URI:  ${process.env.MONGO_URI ? 'SET' : 'MISSING \u26a0\ufe0f'}`);
});

// Handle port already in use gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} is already in use. Kill the existing process first.`);
    process.exit(1);
  } else {
    console.error('[SERVER ERROR]', err);
  }
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err.message);
});
