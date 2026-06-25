import { body } from 'express-validator';
import { ROLE_SLUGS } from './role.util';

export const registerValidators = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('name must be 2-100 characters long'),
  body('email').isEmail().normalizeEmail().withMessage('email must be valid'),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('password must be 8-128 characters long'),
  body('role')
    .isString()
    .isIn(ROLE_SLUGS)
    .withMessage(`role must be one of: ${ROLE_SLUGS.join(', ')}`),
  body('department')
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 80 })
    .withMessage('department must be up to 80 characters long'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
];
