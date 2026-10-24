const express = require('express');
const productController = require('../controllers/product.controller');
const { requireUserHeader, requireAdmin } = require('../middlewares/auth-header.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createProductSchema, updateProductSchema } = require('../validators/product.validator');

const router = express.Router();

router.use(requireUserHeader);

router.get('/', (req, res, next) => {
  productController.getAllProducts(req, res, next);
});

router.get('/:pid', (req, res, next) => {
  productController.getProductByPid(req, res, next);
});

router.post('/', requireAdmin, validate(createProductSchema), (req, res, next) => {
  productController.createProduct(req, res, next);
});

router.put('/:pid', requireAdmin, validate(updateProductSchema), (req, res, next) => {
  productController.updateProduct(req, res, next);
});

router.delete('/:pid', requireAdmin, (req, res, next) => {
  productController.deleteProduct(req, res, next);
});

module.exports = router;
