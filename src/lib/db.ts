import { PrismaClient, Prisma } from "@prisma/client";
import { Pool, PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Pool configuration with resilience settings
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Connection limits
  max: 20, // Maximum number of connections
  min: 2, // Minimum number of connections
  // Timeouts
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Fail connection attempt after 10s
  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

function createPool(): Pool {
  const pool = new Pool(poolConfig);

  // Handle pool errors to prevent crashes
  pool.on("error", (err) => {
    console.error("[DB Pool] Unexpected error on idle client:", err.message);
    // Don't crash the process, just log the error
  });

  pool.on("connect", () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[DB Pool] New client connected");
    }
  });

  return pool;
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pool ?? createPool();
  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ============================================
// Database Utilities for Resilience
// ============================================

/**
 * Check if database is healthy
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("[DB Health] Database health check failed:", error);
    return false;
  }
}

/**
 * Retry a database operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    operationName = "database operation",
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt - 1),
          maxDelayMs
        );
        console.warn(
          `[DB Retry] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`,
          lastError.message
        );
        await sleep(delay);
      }
    }
  }

  console.error(
    `[DB Retry] ${operationName} failed after ${maxRetries} attempts`
  );
  throw lastError;
}

/**
 * Execute a database operation with error handling
 * Returns null instead of throwing on error
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  options: {
    fallback?: T;
    operationName?: string;
    logError?: boolean;
  } = {}
): Promise<T | null> {
  const { fallback, operationName = "database operation", logError = true } = options;

  try {
    return await operation();
  } catch (error) {
    if (logError) {
      console.error(`[DB Safe] ${operationName} failed:`, error);
    }
    return fallback ?? null;
  }
}

/**
 * Run multiple operations in a transaction with retry
 */
export async function withTransaction<T>(
  operations: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    maxRetries?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const { maxRetries = 3, operationName = "transaction" } = options;

  return withRetry(
    () => db.$transaction(operations, {
      maxWait: 5000, // Max time to wait for transaction slot
      timeout: 30000, // Max time for transaction to complete
    }),
    { maxRetries, operationName }
  );
}

// ============================================
// Helper Functions
// ============================================

function isRetryableError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Connection errors, deadlocks, timeouts
    const retryableCodes = [
      "P1001", // Can't reach database server
      "P1002", // Database server timeout
      "P1008", // Operations timed out
      "P1017", // Server closed connection
      "P2024", // Timed out fetching connection from pool
      "P2034", // Transaction failed due to conflict or deadlock
    ];
    return retryableCodes.includes(error.code);
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return true; // Unknown errors might be transient
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("connection") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("deadlock")
    );
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Graceful Shutdown
// ============================================

let isShuttingDown = false;

export async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("[DB] Initiating graceful shutdown...");

  try {
    await db.$disconnect();
    if (globalForPrisma.pool) {
      await globalForPrisma.pool.end();
    }
    console.log("[DB] Database connections closed");
  } catch (error) {
    console.error("[DB] Error during shutdown:", error);
  }
}

// Handle process termination
if (typeof process !== "undefined") {
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}
