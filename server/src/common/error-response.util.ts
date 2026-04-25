import type { Response } from 'express';

export interface StandardErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

export function sendStandardError(
  res: Response,
  status: number,
  message: string,
  errors?: unknown,
): void {
  const payload: StandardErrorResponse = {
    success: false,
    message,
  };

  if (errors !== undefined) {
    payload.errors = errors;
  }

  res.status(status).json(payload);
}
