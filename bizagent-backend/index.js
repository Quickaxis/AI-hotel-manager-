require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./services/db');

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    product: 'BizAgent',
    by: 'Octavium',
    version: '1.0.0',
    whatsapp: process.env.WHATSAPP_NUMBER
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/business', require('./routes/business'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/data', require('./routes/data'));
app.use('/api/admin', require('./routes/admin'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', req.path, err);
  if (res.headersSent) {
    return next(err)
  }
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Unhandled Promise Rejections & Exceptions
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('Initializing database...');
    await db.initializeDB();
    
    app.listen(PORT, () => {
      console.log(`BizAgent backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
