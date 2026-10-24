const express = require('express');
const shipmentController = require('../controllers/shipment.controller');
const authHeaderMiddleware = require('../middlewares/auth-header.middleware');

const router = express.Router();

router.use(authHeaderMiddleware);

router.get('/order/:oid', (req, res, next) => shipmentController.getShipmentByOid(req, res, next));
router.get('/:shipid', (req, res, next) => shipmentController.getShipmentByShipid(req, res, next));
router.patch('/:shipid/status', (req, res, next) => shipmentController.updateShipmentStatus(req, res, next));

module.exports = router;
