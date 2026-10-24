const productService = require('../../../application/product.service');

class ProductController {
  async getAllProducts(req, res, next) {
    try {
      const result = await productService.getAllProducts();
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProductByPid(req, res, next) {
    try {
      const result = await productService.getProductByPid(req.params.pid);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const result = await productService.createProduct(req.body);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const result = await productService.updateProduct(req.params.pid, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const result = await productService.deleteProduct(req.params.pid);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
