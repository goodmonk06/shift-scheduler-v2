/**
 * Custom Error Classes for Application-wide Error Handling
 *
 * Provides structured error handling with appropriate HTTP status codes
 * and contextual information for better debugging and user experience.
 */

/**
 * Base Application Error
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * Used for invalid user input or malformed requests
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", context?: Record<string, unknown>) {
    super(message, 400, true, context);
  }
}

/**
 * Unauthorized Error (401)
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required", context?: Record<string, unknown>) {
    super(message, 401, true, context);
  }
}

/**
 * Forbidden Error (403)
 * Used when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden", context?: Record<string, unknown>) {
    super(message, 403, true, context);
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", context?: Record<string, unknown>) {
    super(`${resource} not found`, 404, true, context);
  }
}

/**
 * Conflict Error (409)
 * Used when request conflicts with current state (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message: string = "Conflict with existing data", context?: Record<string, unknown>) {
    super(message, 409, true, context);
  }
}

/**
 * Validation Error (422)
 * Used for semantic validation failures
 */
export class ValidationError extends AppError {
  constructor(
    message: string = "Validation failed",
    public readonly errors?: Record<string, string[]>,
    context?: Record<string, unknown>
  ) {
    super(message, 422, true, { ...context, validationErrors: errors });
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = "Internal server error",
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message, 500, false, { ...context, originalError: originalError?.message });
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Database Error
 * Used for database-specific errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = "Database operation failed",
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message, 500, true, { ...context, originalError: originalError?.message });
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * External Service Error
 * Used when external API calls fail (LLM, email, etc.)
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string = "External service error",
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(`${service}: ${message}`, 502, true, { ...context, service, originalError: originalError?.message });
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * Rate Limit Error (429)
 * Used when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    retryAfter?: number,
    message: string = "Too many requests",
    context?: Record<string, unknown>
  ) {
    super(message, 429, true, { ...context, retryAfter });
  }
}

/**
 * Check if an error is operational (expected and handleable)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for logging
 */
export function formatErrorForLog(error: Error): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack,
    };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}
