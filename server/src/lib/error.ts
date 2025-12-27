export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }

  // Static factory methods for common HTTP errors
  static BadRequest(message: string = "Bad Request", details?: unknown): AppError {
    return new AppError(message, 400, true, details);
  }

  static Unauthorized(message: string = "Unauthorized", details?: unknown): AppError {
    return new AppError(message, 401, true, details);
  }

  static Forbidden(message: string = "Forbidden", details?: unknown): AppError {
    return new AppError(message, 403, true, details);
  }

  static NotFound(message: string = "Not Found", details?: unknown): AppError {
    return new AppError(message, 404, true, details);
  }

  static Conflict(message: string = "Conflict", details?: unknown): AppError {
    return new AppError(message, 409, true, details);
  }

  static Validation(message: string = "Validation Error", details?: unknown): AppError {
    return new AppError(message, 422, true, details);
  }

  static InternalServerError(
    message: string = "Internal Server Error",
    details?: unknown,
  ): AppError {
    return new AppError(message, 500, false, details);
  }

  static ServiceUnavailable(message: string = "Service Unavailable", details?: unknown): AppError {
    return new AppError(message, 503, true, details);
  }
}
