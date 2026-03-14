const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/receipts',   require('./routes/receipts'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/transfers',  require('./routes/transfers'));
app.use('/api/adjustments',require('./routes/adjustments'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/moves',      require('./routes/moves'));
app.use('/api/locations',  require('./routes/locations'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'CoreInventory API running' }));

// Connect DB & start server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });
