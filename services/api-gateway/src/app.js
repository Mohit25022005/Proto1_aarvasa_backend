const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');
const { errorHandler } = require('../../../shared/utils/errorHandler');

dotenv.config();
const app = express();

app.use(express.json());

// Proxy routes
app.use('/api/auth', createProxyMiddleware({ target: 'http://user-service:3001', changeOrigin: true }));
app.use('/api/users', createProxyMiddleware({ target: 'http://user-service:3001', changeOrigin: true }));

// Error Handling
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API Gateway running on port ${port}`);
});

module.exports = app;