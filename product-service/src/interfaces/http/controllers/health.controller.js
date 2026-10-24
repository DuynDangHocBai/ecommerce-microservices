const productService = require('../../../application/product.service');

class HealthController {
  async getHealth(req, res) {
    try {
      const health = await productService.checkHealth();
      return res.status(200).json(health);
    } catch (error) {
      console.error('[product-service] Health check failed:', error.message);
      return res.status(503).json({
        status: 'DOWN',
        service: 'product-service',
        db: 'DOWN',
        grpc: 'UP'
      });
    }
  }
}

module.exports = new HealthController();
