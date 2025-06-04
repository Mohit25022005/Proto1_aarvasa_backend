const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { errorHandler } = require('../../../shared/utils/errorHandler');

dotenv.config();
const app = express();

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Error Handling
app.use(errorHandler);

// Database Sync
sequelize.sync().then(() => {
  console.log('Database synced');
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`User Service running on port ${port}`);
  });
}).catch((err) => {
  console.error('Database sync failed:', err);
});

module.exports = app;