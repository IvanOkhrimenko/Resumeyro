import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// ============================================
// API Response Helpers
// ============================================

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  data: T;
}

/**
 * Create a success response
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data }, { status });
}

/**
 * Create an error response
 */
export function apiError(
  message: string,
  status = 500,
  options?: { code?: string; details?: unknown }
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = { error: message };
  if (options?.code) response.code = options.code;
  if (options?.details) response.details = options.details;

  return NextResponse.json(response, { status });
}

// ============================================
// Error Handler Wrapper
// ============================================

type RouteHandler<T = unknown> = (
  request: Request,
  context?: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse<T>>;

/**
 * Wrap an API route handler with error handling
 * Catches all errors and returns appropriate responses
 */
export function withErrorHandler<T>(
  handler: RouteHandler<T>,
  options?: {
    operationName?: string;
  }
): RouteHandler<T | ApiErrorResponse> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, options?.operationName);
    }
  };
}

/**
 * Handle different types of errors and return appropriate responses
 */
export function handleApiError(
  error: unknown,
  operationName?: string
): NextResponse<ApiErrorResponse> {
  // Log the error with context
  const errorContext = operationName ? `[${operationName}]` : "[API]";
  console.error(`${errorContext} Error:`, error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return apiError("Validation error", 400, {
      code: "VALIDATION_ERROR",
      details: error.issues,
    });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return apiError("Invalid data provided", 400, {
      code: "PRISMA_VALIDATION_ERROR",
    });
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return apiError("Service temporarily unavailable", 503, {
      code: "DATABASE_UNAVAILABLE",
    });
  }

  // Standard errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error.message;

    return apiError(message, 500, {
      code: "INTERNAL_ERROR",
    });
  }

  // Unknown errors
  return apiError("An unexpected error occurred", 500, {
    code: "UNKNOWN_ERROR",
  });
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  error: Prisma.PrismaClientKnownRequestError
): NextResponse<ApiErrorResponse> {
  switch (error.code) {
    // Unique constraint violation
    case "P2002":
      const fields = (error.meta?.target as string[]) || ["field"];
      return apiError(`A record with this ${fields.join(", ")} already exists`, 409, {
        code: "DUPLICATE_ENTRY",
        details: { fields },
      });

    // Foreign key constraint violation
    case "P2003":
      return apiError("Referenced record does not exist", 400, {
        code: "FOREIGN_KEY_VIOLATION",
      });

    // Record not found
    case "P2025":
      return apiError("Record not found", 404, {
        code: "NOT_FOUND",
      });

    // Connection errors
    case "P1001":
    case "P1002":
    case "P1008":
    case "P1017":
    case "P2024":
      return apiError("Service temporarily unavailable", 503, {
        code: "DATABASE_UNAVAILABLE",
      });

    // Transaction errors
    case "P2034":
      return apiError("Please try again", 503, {
        code: "TRANSACTION_CONFLICT",
      });

    default:
      return apiError("Database error occurred", 500, {
        code: `PRISMA_${error.code}`,
      });
  }
}

// ============================================
// Retry Utilities for External Services
// ============================================

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      if (onRetry) {
        onRetry(error, attempt);
      }

      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelayMs
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Default retry condition for network/external service errors
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("socket hang up") ||
      message.includes("network") ||
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("503") ||
      message.includes("502")
    );
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Request Validation
// ============================================

/**
 * Safely parse JSON from request body
 */
export async function safeParseJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Get authenticated user or return 401 error
 */
export function requireAuth<T extends { user?: { id?: string } }>(
  session: T | null
): { userId: string } | NextResponse<ApiErrorResponse> {
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401, { code: "UNAUTHORIZED" });
  }
  return { userId: session.user.id };
}
