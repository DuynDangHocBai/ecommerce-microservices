const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/', (req, res) => {
  healthController.getHealth(req, res);
});

module.exports = router;
