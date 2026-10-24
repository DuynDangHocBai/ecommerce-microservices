const express = require('express');
const orderController = require('../controllers/order.controller');
const authHeaderMiddleware = require('../middlewares/auth-header.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createOrderSchema } = require('../validators/order.validator');

const router = express.Router();

router.use(authHeaderMiddleware);

router.post('/', validate(createOrderSchema), (req, res, next) => orderController.createOrder(req, res, next));
router.get('/', (req, res, next) => orderController.getOrders(req, res, next));
router.get('/:oid', (req, res, next) => orderController.getOrderById(req, res, next));

module.exports = router;
