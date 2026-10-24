const shipmentService = require('../../../application/shipment.service');

class HealthController {
  async checkHealth(req, res) {
    try {
      const result = await shipmentService.checkHealth();
      res.status(200).json(result);
    } catch (err) {
      console.error('[shipment-service] Health check failed:', err.message);
      res.status(503).json({
        status: 'DOWN',
        service: 'shipment-service',
        db: 'DOWN',
        kafka: 'DOWN',
        error: 'Database connection failed'
      });
    }
  }
}

module.exports = new HealthController();
