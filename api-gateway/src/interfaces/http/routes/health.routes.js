const express = require('express');
const redis = require('../../../infrastructure/redis/redis.client');
const config = require('../../../config/env');

const router = express.Router();

async function checkServiceHealth(name, baseUrl) {
  try {
    const url = `${baseUrl}/health`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'UP') {
        return 'UP';
      }
    }
    return 'DOWN';
  } catch (err) {
    return 'DOWN';
  }
}

router.get('/', async (req, res) => {
  const servicesStatus = {};
  let isAllUp = true;

  // 1. Check Redis
  try {
    const redisPong = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
    ]);
    if (redisPong === 'PONG') {
      servicesStatus.redis = 'UP';
    } else {
      servicesStatus.redis = 'DOWN';
      isAllUp = false;
    }
  } catch (err) {
    servicesStatus.redis = 'DOWN';
    isAllUp = false;
  }

  // 2. Check Downstream Services in HEALTH_SERVICES
  const serviceChecks = config.healthServices.map(async (serviceName) => {
    const serviceUrl = config.services[serviceName];
    if (serviceUrl) {
      const status = await checkServiceHealth(serviceName, serviceUrl);
      servicesStatus[serviceName] = status;
      if (status !== 'UP') {
        isAllUp = false;
      }
    }
  });

  await Promise.all(serviceChecks);

  const statusCode = isAllUp ? 200 : 503;
  return res.status(statusCode).json({
    status: isAllUp ? 'UP' : 'DOWN',
    message: isAllUp ? 'E-commerce API is running' : 'E-commerce API is degraded',
    services: servicesStatus
  });
});

module.exports = router;
