/**
 * API response types
 */

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
