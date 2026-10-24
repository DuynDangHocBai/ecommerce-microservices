const express = require('express');
const customerController = require('../controllers/customer.controller');
const { requireUserHeader, authorizeCustomerAccess } = require('../middlewares/auth-header.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateCustomerSchema } = require('../validators/customer.validator');

const router = express.Router();

router.use(requireUserHeader);

router.get('/:uid', authorizeCustomerAccess, (req, res, next) => {
  customerController.getCustomer(req, res, next);
});

router.get('/:uid/membership', authorizeCustomerAccess, (req, res, next) => {
  customerController.getMembership(req, res, next);
});

router.put('/:uid', authorizeCustomerAccess, validate(updateCustomerSchema), (req, res, next) => {
  customerController.updateCustomer(req, res, next);
});

module.exports = router;
