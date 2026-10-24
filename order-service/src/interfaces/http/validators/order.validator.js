const Joi = require('joi');

const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        pid: Joi.number().integer().positive().required().messages({
          'number.base': 'pid must be a number',
          'number.integer': 'pid must be an integer',
          'number.positive': 'pid must be greater than 0',
          'any.required': 'pid is required'
        }),
        qty: Joi.number().integer().positive().required().messages({
          'number.base': 'qty must be a number',
          'number.integer': 'qty must be an integer',
          'number.positive': 'qty must be greater than 0',
          'any.required': 'qty is required'
        })
      })
    )
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.base': 'items must be an array',
      'array.min': 'items must have at least 1 item',
      'array.max': 'items cannot exceed 50 items',
      'any.required': 'items is required'
    })
});

module.exports = {
  createOrderSchema
};
