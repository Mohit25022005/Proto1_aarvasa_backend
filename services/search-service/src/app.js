const express = require('express');
const dotenv = require('dotenv');  // You imported dotenv but didn't use this variable directly
const searchRoutes = require('./routes/searchRoutes');
const searchLogger = require('./middleware/searchMiddleware');

dotenv.config();  // This is enough to load .env at the very start

const app = express();

app.use(express.json());
app.use(searchLogger);
app.use('/api', searchRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Search service running on port ${PORT}`);
});
