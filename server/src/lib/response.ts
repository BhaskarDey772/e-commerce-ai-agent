import { env } from "@/env";
import type { AppError } from "@/lib/error";

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    statusCode: number;
    details?: unknown;
    timestamp: string;
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    count?: number;
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export function errorResponse(error: AppError): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: error.message,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
    },
  };

  // Include details if available and not in production
  if (error.details && env.NODE_ENV !== "production") {
    response.error.details = error.details;
  }

  return response;
}

export function successResponse<T = unknown>(
  data: T,
  metadata?: SuccessResponse<T>["metadata"],
): SuccessResponse<T> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (metadata) {
    response.metadata = metadata;
  }

  return response;
}
