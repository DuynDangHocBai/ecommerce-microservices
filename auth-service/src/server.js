require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4101;

const server = app.listen(PORT, () => {
  console.log(`[auth-service] Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[auth-service] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[auth-service] HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('[auth-service] SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('[auth-service] HTTP server closed');
  });
});
