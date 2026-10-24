const express = require('express');
const morgan = require('morgan');
const customerRoutes = require('./interfaces/http/routes/customer.routes');
const healthRoutes = require('./interfaces/http/routes/health.routes');
const { errorHandler } = require('./interfaces/http/middlewares/error.middleware');

const app = express();

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/customers', customerRoutes);

app.use(errorHandler);

module.exports = app;
