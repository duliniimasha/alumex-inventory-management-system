import type { NextFunction, Request, Response } from 'express';
import {
  validationResult,
  type ValidationChain,
  type ValidationError,
} from 'express-validator';
import { sendStandardError } from '../common/error-response.util';

interface ValidationIssue {
  field: string;
  message: string;
}

function toValidationIssues(errors: ValidationError[]): ValidationIssue[] {
  return errors.map((error) => ({
    field: 'path' in error ? String(error.path) : 'unknown',
    message: error.msg,
  }));
}

export function validateRequest(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const result = validationResult(req);

    if (!result.isEmpty()) {
      sendStandardError(
        res,
        400,
        'Validation failed',
        toValidationIssues(result.array()),
      );
      return;
    }

    next();
  };
}
