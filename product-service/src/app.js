const express = require('express');
const morgan = require('morgan');
const productRoutes = require('./interfaces/http/routes/product.routes');
const healthRoutes = require('./interfaces/http/routes/health.routes');
const { errorHandler } = require('./interfaces/http/middlewares/error.middleware');

const app = express();

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(express.json());

app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/products', productRoutes);

app.use(errorHandler);

module.exports = app;
