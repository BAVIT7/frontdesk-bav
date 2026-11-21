const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const customerRoutes = require('./routes/customerRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Frontdesk - Arvo Systems Support Platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend static build in production
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// Fallback to serve React SPA index.html
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Frontdesk API is running. Build frontend to view UI.');
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
const server = app.listen(config.PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Frontdesk Server is running on port ${config.PORT}`);
  console.log(`🏢 Arvo Systems Customer Support Ticket Management`);
  console.log(`🕒 SLA Working Schedule: 09:30 - 18:30 (Mon - Fri)`);
  console.log(`=================================================`);
});

module.exports = { app, server };
