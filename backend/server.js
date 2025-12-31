// Load environment variables first
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { initialize } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
const logoDir = path.join(uploadsDir, 'logo');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());

// Cache middleware for metadata endpoints
const { cacheMiddleware } = require('./middleware/cache');
app.use('/api', cacheMiddleware);

app.use('/uploads', express.static(uploadsDir));

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { pool } = require('./database');
    // Test database connection
    await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      message: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database first (will not throw, just log warnings)
    await initialize();
    
    // Load routes after database initialization attempt
    const authRouter = require('./routes/auth');
    const productsRouter = require('./routes/products');
    const quotationsRouter = require('./routes/quotations');
    const settingsRouter = require('./routes/settings');
    const brandsRouter = require('./routes/brands');
    const categoriesRouter = require('./routes/categories');
    const subcategoriesRouter = require('./routes/subcategories');
    const imagesRouter = require('./routes/images');
    
    // API Routes - Auth routes first (no authentication required)
    app.use('/api/auth', authRouter);
    
    // Protected API Routes (add auth middleware if needed in future)
    app.use('/api/products', productsRouter);
    app.use('/api/quotations', quotationsRouter);
    app.use('/api/settings', settingsRouter);
    app.use('/api/brands', brandsRouter);
    app.use('/api/categories', categoriesRouter);
    app.use('/api/subcategories', subcategoriesRouter);
    app.use('/api/images', imagesRouter);

    // Serve frontend for all other routes in production
    if (process.env.NODE_ENV === 'production') {
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log('');
      console.log('💡 If you see database connection errors above, please check:');
      console.log('   1. Your internet connection');
      console.log('   2. Neon DB database is running and accessible');
      console.log('   3. Connection string is correct');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // Only exit if it's a critical error (not database related)
    if (!error.message.includes('database') && !error.message.includes('ENOTFOUND')) {
      process.exit(1);
    } else {
      console.warn('⚠️  Server started but database connection failed. Some features may not work.');
    }
  }
}

startServer();

module.exports = app;
