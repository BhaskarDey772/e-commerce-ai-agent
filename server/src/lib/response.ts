import { env } from "@/env";
import type { AppError } from "./error";
import type { ErrorResponse, SuccessResponse } from "@/types";

export type { ErrorResponse, SuccessResponse };

export function errorResponse(error: AppError): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: error.message,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
    },
  };

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
