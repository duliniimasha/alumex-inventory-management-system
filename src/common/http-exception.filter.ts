import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        response.status(status).json({
          success: false,
          message: exceptionResponse,
        });
        return;
      }

      const responseBody = exceptionResponse as {
        message?: string | string[];
        error?: string;
        errors?: unknown;
      };

      const rawMessage = responseBody.message;
      const message = Array.isArray(rawMessage)
        ? 'Validation failed'
        : (rawMessage ?? exception.message);

      const errors = Array.isArray(rawMessage)
        ? rawMessage
        : responseBody.errors;

      response.status(status).json({
        success: false,
        message,
        ...(errors !== undefined ? { errors } : {}),
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
