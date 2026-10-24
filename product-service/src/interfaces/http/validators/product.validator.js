const Joi = require('joi');

const createProductSchema = Joi.object({
  pname: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'pname is required',
    'string.min': 'pname must be between 1 and 100 characters',
    'string.max': 'pname must be between 1 and 100 characters',
    'any.required': 'pname is required'
  }),
  price: Joi.number().positive().required().messages({
    'number.base': 'price must be a number',
    'number.positive': 'price must be greater than 0',
    'any.required': 'price is required'
  }),
  quantity: Joi.number().integer().min(0).required().messages({
    'number.base': 'quantity must be an integer',
    'number.integer': 'quantity must be an integer',
    'number.min': 'quantity must be greater than or equal to 0',
    'any.required': 'quantity is required'
  })
});

const updateProductSchema = Joi.object({
  pname: Joi.string().trim().min(1).max(100).optional().messages({
    'string.min': 'pname must be between 1 and 100 characters',
    'string.max': 'pname must be between 1 and 100 characters'
  }),
  price: Joi.number().positive().optional().messages({
    'number.base': 'price must be a number',
    'number.positive': 'price must be greater than 0'
  }),
  quantity: Joi.number().integer().min(0).optional().messages({
    'number.base': 'quantity must be an integer',
    'number.integer': 'quantity must be an integer',
    'number.min': 'quantity must be greater than or equal to 0'
  })
}).min(1).messages({
  'object.min': 'At least one field (pname, price, quantity) must be provided for update'
});

module.exports = {
  createProductSchema,
  updateProductSchema
};
