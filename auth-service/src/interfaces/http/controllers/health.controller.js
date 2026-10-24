const authService = require('../../../application/auth.service');

class HealthController {
  async getHealth(req, res) {
    try {
      const health = await authService.checkHealth();
      return res.status(200).json(health);
    } catch (error) {
      console.error('[auth-service] Health check failed:', error.message);
      return res.status(503).json({
        status: 'DOWN',
        service: 'auth-service',
        db: 'DOWN'
      });
    }
  }
}

module.exports = new HealthController();
