const express = require('express');
const morgan = require('morgan');
const authRoutes = require('./interfaces/http/routes/auth.routes');
const healthRoutes = require('./interfaces/http/routes/health.routes');
const { errorHandler } = require('./interfaces/http/middlewares/error.middleware');

const app = express();

// HTTP Logger
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Parse JSON request bodies
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
