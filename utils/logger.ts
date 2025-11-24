/**
 * Logger utility using react-native-logs
 * Configured to only log in development mode for production performance
 */

import { consoleTransport, logger } from "react-native-logs";

export const customLog = logger.createLogger({
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: "debug",
  transport: consoleTransport,
  transportOptions: {
    colors: {
      info: "blueBright",
      warn: "yellowBright",
      error: "redBright",
      debug: "magenta",
    },
  },
  async: true,
  dateFormat: "time",
  printLevel: true,
  printDate: true,
  fixedExtLvlLength: false,
  enabled: __DEV__,
});

// Convenience methods for common logging patterns
export const log = customLog.debug;
export const logInfo = customLog.info;
export const logWarn = customLog.warn;
export const logError = customLog.error;

/**
 * Logs SQL query information (only in development)
 * @param queryId - Unique identifier for the query
 * @param query - SQL query string
 * @param params - Query parameters
 * @param resultCount - Number of rows returned
 */
export function logSQL(
  queryId: string,
  query: string,
  params: any[],
  resultCount?: number
): void {
  if (__DEV__) {
    customLog.debug(`[SQL Query - ${queryId}]`, query);
    customLog.debug(`[SQL Params - ${queryId}]`, params);
    if (resultCount !== undefined) {
      customLog.debug(`[SQL Result - ${queryId}]`, resultCount, "rows");
    }
  }
}

/**
 * Logs performance metrics (only in development)
 * @param label - Performance label
 * @param duration - Duration in milliseconds
 * @param additionalInfo - Additional information to log
 */
export function logPerformance(
  label: string,
  duration: number,
  additionalInfo?: string
): void {
  if (__DEV__) {
    const message = `[Performance] ${label}: ${duration}ms${
      additionalInfo ? ` (${additionalInfo})` : ""
    }`;
    customLog.debug(message);
  }
}

export function logErrorDetails(error: unknown): void {
  if (__DEV__) {
    customLog.error("Error:", error);
    if (error instanceof Error) {
      customLog.error("Error message:", error.message);
      customLog.error("Error stack:", error.stack);
    } else if (typeof error === "string") {
      customLog.error("Error message:", error);
    } else if (error && typeof error === "object" && "message" in error) {
      customLog.error("Error message:", error.message);
    }
  }
}
