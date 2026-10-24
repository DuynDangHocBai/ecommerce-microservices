const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required().messages({
    'string.empty': 'username is required',
    'string.min': 'username must be between 3 and 50 characters',
    'string.max': 'username must be between 3 and 50 characters',
    'any.required': 'username is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.empty': 'password is required',
    'string.min': 'password must be at least 6 characters long',
    'any.required': 'password is required'
  }),
  email: Joi.string().email().max(100).allow(null, '').optional().messages({
    'string.email': 'email must be a valid email address'
  }),
  phone: Joi.string().max(20).allow(null, '').optional()
});

const loginSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'string.empty': 'username is required',
    'any.required': 'username is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'password is required',
    'any.required': 'password is required'
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
