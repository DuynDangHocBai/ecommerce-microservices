const orderService = require('../../../application/order.service');

class HealthController {
  async checkHealth(req, res) {
    try {
      const result = await orderService.checkHealth();
      res.status(200).json(result);
    } catch (err) {
      console.error('[order-service] Health check failed:', err.message);
      res.status(503).json({
        status: 'DOWN',
        service: 'order-service',
        db: 'DOWN',
        error: 'Database connection failed'
      });
    }
  }
}

module.exports = new HealthController();
