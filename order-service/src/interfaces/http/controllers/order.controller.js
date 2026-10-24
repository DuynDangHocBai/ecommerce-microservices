const orderService = require('../../../application/order.service');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const result = await orderService.createOrder(req.user.uid, req.body.items);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOrders(req, res, next) {
    try {
      const result = await orderService.getOrders(req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const result = await orderService.getOrderById(req.params.oid, req.user);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new OrderController();
