const customerService = require('../../../application/customer.service');

class CustomerController {
  async getCustomer(req, res, next) {
    try {
      const customer = await customerService.getCustomerById(req.params.uid);
      return res.status(200).json(customer);
    } catch (error) {
      next(error);
    }
  }

  async getMembership(req, res, next) {
    try {
      const membership = await customerService.getMembershipScore(req.params.uid);
      return res.status(200).json(membership);
    } catch (error) {
      next(error);
    }
  }

  async updateCustomer(req, res, next) {
    try {
      if (req.body.mid !== undefined && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Forbidden: Only ADMIN can update membership'
        });
      }

      const result = await customerService.updateCustomer(req.params.uid, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerController();
