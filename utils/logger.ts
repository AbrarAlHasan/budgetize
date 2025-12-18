/**
 * Enhanced Logger utility with production logging support
 * 
 * Features:
 * - Console logging (development only)
 * - Firebase Crashlytics integration (production errors/warnings)
 * - Sentry integration with proper log levels
 */

import { Platform } from "react-native";
import { consoleTransport, logger } from "react-native-logs";

// Sentry (lazy import to avoid issues if not available)
let Sentry: any = null;
try {
  if (Platform.OS !== "web") {
    Sentry = require("@sentry/react-native");
  }
} catch (error) {
  // Sentry not available, continue without it
}

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

/**
 * Helper function to format log arguments into a message string
 */
function formatLogMessage(args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
}

/**
 * Send log to Sentry with proper severity level
 * Sentry severity levels: debug, info, warning, error, fatal
 */
function sendToSentry(
  message: string,
  level: "debug" | "info" | "warning" | "error" | "fatal" = "info"
): void {
  if (!Sentry || __DEV__) return;

  try {
    // Use captureMessage with severity level in options
    // This ensures the log level is properly set in Sentry
    Sentry.captureMessage(message, {
      level: level as any, // Sentry.SeverityLevel type
    });
  } catch (error) {
    // Silently fail if Sentry not available or fails
  }
}

/**
 * Send error to Sentry with proper context
 */
function sendErrorToSentry(error: Error | string, context?: string): void {
  if (!Sentry || __DEV__) return;

  try {
    if (error instanceof Error) {
      // Use captureException for Error objects with context
      Sentry.captureException(error, {
        level: "error",
        tags: context ? { context } : undefined,
      });
    } else {
      // Use captureMessage for string errors with error level
      Sentry.captureMessage(error, {
        level: "error" as any,
        tags: context ? { context } : undefined,
      });
    }
  } catch (err) {
    // Silently fail if Sentry not available or fails
  }
}

// Override log methods to add Sentry and Firebase Crashlytics integration
const originalDebug = customLog.debug;
const originalInfo = customLog.info;
const originalWarn = customLog.warn;
const originalError = customLog.error;

customLog.debug = (...args: any[]) => {
  originalDebug(...args);
  // Sentry: debug level (only in production if needed)
  if (Sentry && !__DEV__) {
    const message = formatLogMessage(args);
    sendToSentry(message, "debug");
  }
};

customLog.info = (...args: any[]) => {
  originalInfo(...args);
  // Sentry: info level
  const message = formatLogMessage(args);
  sendToSentry(message, "info");
  
  // Firebase Crashlytics doesn't log info by default
};

customLog.warn = (...args: any[]) => {
  originalWarn(...args);
  const message = formatLogMessage(args);
  
  // Sentry: warning level
  sendToSentry(message, "warning");
  
  // Firebase Crashlytics (production)
  if (crashlytics && !__DEV__) {
    try {
      crashlytics.log(`[WARN] ${message}`);
    } catch (error) {
      // Silently fail if Crashlytics not available
    }
  }
};

customLog.error = (...args: any[]) => {
  originalError(...args);
  const message = formatLogMessage(args);
  
  // Sentry: error level
  sendToSentry(message, "error");
  
  // Also send as exception to Sentry for better error tracking
  if (Sentry && !__DEV__) {
    try {
      // Check if any arg is an Error object
      const errorArg = args.find((arg) => arg instanceof Error);
      if (errorArg instanceof Error) {
        sendErrorToSentry(errorArg);
      } else {
        sendErrorToSentry(new Error(message));
      }
    } catch (err) {
      // Silently fail
    }
  }
  
  // Firebase Crashlytics (production)
  if (crashlytics && !__DEV__) {
    try {
      crashlytics.log(`[ERROR] ${message}`);
      const errorArg = args.find((arg) => arg instanceof Error);
      if (errorArg instanceof Error) {
        crashlytics.recordError(errorArg);
      } else {
        crashlytics.recordError(new Error(message));
      }
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
 * Logs performance metrics (development only)
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

    // Send to Sentry in production
    sendErrorToSentry(error, "logErrorDetails");

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
    sendErrorToSentry(error, "logErrorDetails");
  } else if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    customLog.error(`Error: ${message}`);
    sendErrorToSentry(message, "logErrorDetails");
  } else {
    const message = JSON.stringify(error);
    customLog.error(`Error: ${message}`);
    sendErrorToSentry(message, "logErrorDetails");
  }
}
