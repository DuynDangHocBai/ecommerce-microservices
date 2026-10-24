const Joi = require('joi');

const updateCustomerSchema = Joi.object({
  fullname: Joi.string().trim().min(1).max(100).optional().messages({
    'string.min': 'fullname must be between 1 and 100 characters',
    'string.max': 'fullname must be between 1 and 100 characters'
  }),
  mid: Joi.number().integer().positive().optional().messages({
    'number.base': 'mid must be an integer',
    'number.positive': 'mid must be a positive integer'
  })
}).min(1).messages({
  'object.min': 'At least one field (fullname, mid) must be provided for update'
});

module.exports = {
  updateCustomerSchema
};
