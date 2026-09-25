// app.js - Main entry point (v2.0 — NovaCare procedure-guidance platform)
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const mlRoutes = require('./routes/mlRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// ===== Security & logging =====
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' } // allow images from /uploads
  })
);
app.use(morgan('dev'));

// ===== CORS =====
app.use(cors({ origin: '*', credentials: true })); // open for hackathon (ngrok)

// ===== Body parsing =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Rate limiting =====
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' }
});
app.use(globalLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'AI rate limit hit. Wait a minute.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many auth attempts. Try later.' }
});

// ML verification can be called very frequently (near-real-time frames from
// the AR loop), so it gets its own generous but bounded limit.
const mlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  message: { error: 'ML verification rate limit hit. Slow down the perception loop.' }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== DB =====
connectDB();

// ===== Health check =====
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NovaCare backend running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// ===== Routes =====
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ml', mlLimiter, mlRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/reports', reportRoutes);

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ===== Error handler (LAST) =====
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: 'File too large (max 10MB)' });

  console.error('[ERROR]', err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 NovaCare backend running on http://localhost:${PORT}`);
  console.log(`📡 Expose via: ngrok http ${PORT}\n`);
});

// ===== Graceful shutdown =====
const shutdown = (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
