
require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const catalogueRoutes = require('./routes/catalogue');
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const prescriptionRoutes = require('./routes/prescriptions');
const lensOptionsRoutes = require('./routes/lensOptions');
const inventoryRoutes = require('./routes/inventory');
const orderRoutes = require('./routes/orders');
const productTypeRoutes = require('./routes/productTypes');
const addressRoutes = require('./routes/addresses');
const adminOrderRoutes = require('./routes/adminOrders');
const notificationRoutes = require('./routes/notifications');
const adminLensOptionsRoutes = require('./routes/adminLensOptions');
const adminStatsRoutes = require('./routes/adminStats');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(express.json());
app.use('/api', catalogueRoutes);
app.use('/api', inventoryRoutes);
app.use('/api', authRoutes);
app.use('/api', adminAuthRoutes);
app.use('/api', adminAuthRoutes);
app.use('/api', prescriptionRoutes);
app.use('/api', lensOptionsRoutes);
app.use('/api', orderRoutes);
app.use('/api', adminOrderRoutes);
app.use('/api', productTypeRoutes);
app.use('/api', addressRoutes);
app.use('/api', notificationRoutes);
app.use('/api', adminLensOptionsRoutes);
app.use('/api', adminStatsRoutes);
const payfastRoutes = require('./routes/payfast');
// 3D model endpoints DISABLED — saves AI generation cost. Code and DB table
// remain intact; uncomment the line to re-enable.
// app.use('/api', require('./routes/product3d'));

// Marketplace — seller onboarding, shop management
app.use('/api', require('./routes/shopInvites'));
app.use('/api', require('./routes/shopsSeller'));
app.use('/api', require('./routes/shopsAdmin'));
app.use('/api', require('./routes/shopsPublic'));
app.use(require('./routes/invitePage'));
app.use('/api', payfastRoutes);
app.use(express.urlencoded({ extended: false }));

// Serve shop logo/banner uploads publicly
app.use('/uploads/shops', express.static(path.join(__dirname, '..', 'uploads', 'shops')));


// Serve product image uploads publicly. Prescriptions live under the same
// uploads/ tree but are NOT served statically — they go through the
// authenticated /api/prescriptions/:id route only.
app.use(
  '/uploads/products',
  express.static(path.join(__dirname, '..', 'uploads', 'products'))
);


app.use('/uploads/models', express.static(require('path').join(__dirname, '..', 'uploads', 'models')));















app.get('/', (req, res) => {
  res.json({
    name: 'SKY OPTICLES API',
    status: 'running',
    version: '1.0.0',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database, current_user AS user'
    );

    res.json({
      status: 'ok',
      service: 'sky-opticles-api',
      database: result.rows[0].database,
      databaseUser: result.rows[0].user,
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);

    res.status(503).json({
      status: 'error',
      service: 'sky-opticles-api',
      message: 'Database connection unavailable',
    });
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`SKY OPTICLES API running on port ${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
