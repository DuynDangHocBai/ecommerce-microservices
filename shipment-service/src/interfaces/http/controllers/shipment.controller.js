const shipmentService = require('../../../application/shipment.service');
const { BadRequestError } = require('../../../domain/errors');

class ShipmentController {
  async getShipmentByShipid(req, res, next) {
    try {
      const result = await shipmentService.getShipmentByShipid(req.params.shipid, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getShipmentByOid(req, res, next) {
    try {
      const result = await shipmentService.getShipmentByOid(req.params.oid, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateShipmentStatus(req, res, next) {
    try {
      if (!req.body || !req.body.status || typeof req.body.status !== 'string') {
        throw new BadRequestError('Body must contain a valid string "status" field');
      }
      const result = await shipmentService.updateShipmentStatus(
        req.params.shipid,
        req.body.status.trim().toUpperCase(),
        req.user
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ShipmentController();
