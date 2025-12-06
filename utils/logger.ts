/**
 * Enhanced Logger utility with production logging support
 * 
 * Features:
 * - Console logging (development only)
 * - Firebase Crashlytics integration (production errors/warnings)
 */

import { Platform } from "react-native";
import { consoleTransport, logger } from "react-native-logs";

// Firebase Crashlytics (lazy import to avoid issues if not available)
let crashlytics: any = null;
try {
  if (!__DEV__ && Platform.OS !== "web") {
    crashlytics = require("@react-native-firebase/crashlytics").default();
  }
} catch (error) {
  // Crashlytics not available, continue without it
}

// Create logger with console transport
export const customLog = logger.createLogger({
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: __DEV__ ? "debug" : "info", // Only debug in development
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
  enabled: true, // Always enabled
});

// Override log methods to add Firebase Crashlytics in production
const originalInfo = customLog.info;
const originalWarn = customLog.warn;
const originalError = customLog.error;

customLog.info = (...args: any[]) => {
  originalInfo(...args);
  // Crashlytics doesn't log info by default
};

customLog.warn = (...args: any[]) => {
  originalWarn(...args);
  // Firebase Crashlytics (production)
  if (crashlytics && !__DEV__) {
    try {
      const message = args.map((arg) => 
        typeof arg === "string" ? arg : JSON.stringify(arg)
      ).join(" ");
      crashlytics.log(`[WARN] ${message}`);
    } catch (error) {
      // Silently fail if Crashlytics not available
    }
  }
};

customLog.error = (...args: any[]) => {
  originalError(...args);
  // Firebase Crashlytics (production)
  if (crashlytics && !__DEV__) {
    try {
      const message = args.map((arg) => 
        typeof arg === "string" ? arg : JSON.stringify(arg)
      ).join(" ");
      crashlytics.log(`[ERROR] ${message}`);
      crashlytics.recordError(new Error(message));
    } catch (error) {
      // Silently fail if Crashlytics not available
    }
  }
};

// Convenience methods for common logging patterns
export const log = customLog.debug;
export const logInfo = customLog.info;
export const logWarn = customLog.warn;
export const logError = customLog.error;

/**
 * Logs SQL query information (development only)
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
 * Logs performance metrics
 */
export function logPerformance(
  label: string,
  duration: number,
  additionalInfo?: string
): void {
  const message = `[Performance] ${label}: ${duration}ms${
    additionalInfo ? ` (${additionalInfo})` : ""
  }`;
  customLog.debug(message);
}

/**
 * Enhanced error logging with stack traces
 */
export function logErrorDetails(error: unknown): void {
  if (error instanceof Error) {
    const errorMsg = `Error: ${error.message}\nStack: ${error.stack || "No stack trace"}`;
    customLog.error(errorMsg);

    // Send to Crashlytics in production
    if (crashlytics && !__DEV__) {
      try {
        crashlytics.recordError(error);
      } catch (err) {
        // Silently fail
      }
    }
  } else if (typeof error === "string") {
    customLog.error(`Error: ${error}`);
  } else if (error && typeof error === "object" && "message" in error) {
    customLog.error(`Error: ${String(error.message)}`);
  } else {
    customLog.error(`Error: ${JSON.stringify(error)}`);
  }
}
