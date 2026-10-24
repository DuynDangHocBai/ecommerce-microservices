const customerService = require('../../../application/customer.service');

class HealthController {
  async getHealth(req, res) {
    try {
      const health = await customerService.checkHealth();
      return res.status(200).json(health);
    } catch (error) {
      console.error('[customer-service] Health check failed:', error.message);
      return res.status(503).json({
        status: 'DOWN',
        service: 'customer-service',
        db: 'DOWN',
        grpc: 'UP'
      });
    }
  }
}

module.exports = new HealthController();
