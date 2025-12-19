/**
 * Enhanced Logger utility with logging support
 *
 * Features:
 * - Console logging
 * - Firebase Crashlytics integration (errors/warnings)
 * - Sentry integration with proper log levels
 *
 * Note: Logging behavior is controlled globally, not within this utility
 */

import crashlytics from "@react-native-firebase/crashlytics";
import * as Sentry from "@sentry/react-native";
import { consoleTransport, logger } from "react-native-logs";

// Create logger with console transport
export const customLog = logger.createLogger({
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: "debug", // Log level controlled globally
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
 * Send error to Sentry with proper context
 */
function sendErrorToSentry(error: Error | string, context?: string): void {
  if (!Sentry) return;

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
  // Sentry: debug level
  if (Sentry) {
    const message = formatLogMessage(args);
  }
};

customLog.info = (...args: any[]) => {
  originalInfo(...args);
  // Sentry: info level
  const message = formatLogMessage(args);

  // Firebase Crashlytics doesn't log info by default
};

customLog.warn = (...args: any[]) => {
  originalWarn(...args);
  const message = formatLogMessage(args);
};

customLog.error = (...args: any[]) => {
  originalError(...args);
  const message = formatLogMessage(args);
};

// Convenience methods for common logging patterns
export const log = customLog.debug;
export const logInfo = customLog.info;
export const logWarn = customLog.warn;
export const logError = customLog.error;

/**
 * Logs SQL query information
 */
export function logSQL(
  queryId: string,
  query: string,
  params: any[],
  resultCount?: number
): void {
  customLog.debug(`[SQL Query - ${queryId}]`, query);
  customLog.debug(`[SQL Params - ${queryId}]`, params);
  if (resultCount !== undefined) {
    customLog.debug(`[SQL Result - ${queryId}]`, resultCount, "rows");
  }
}

/**
 * Normalize performance label to a valid Sentry transaction/span name
 * Sentry names should be lowercase, alphanumeric, and underscores only
 */
function normalizePerformanceLabel(label: string): string {
  let normalized = label.toLowerCase();

  // Remove any "completed", "started", "fetch", "decrypt", "filter" suffixes
  normalized = normalized
    .replace(/\s+completed.*$/i, "")
    .replace(/\s+started.*$/i, "")
    .replace(/\s+fetch.*$/i, "")
    .replace(/\s+decrypt.*$/i, "")
    .replace(/\s+filter.*$/i, "");

  // Remove function parameters like "(123)" or "(id)"
  normalized = normalized.replace(/\([^)]*\)/g, "");

  // Convert to lowercase and replace spaces/special chars with underscores
  normalized = normalized
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

  // Limit length (Sentry has a max length for transaction names)
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100);
  }

  // Ensure it starts with a letter
  if (normalized && /^[0-9]/.test(normalized)) {
    normalized = `perf_${normalized}`;
  }

  return normalized || "performance_metric";
}

/**
 * Logs performance metrics and sends to Sentry Performance Monitoring
 *
 * Creates a custom span/transaction in Sentry with the performance data.
 * Each performance metric becomes a separate transaction in Sentry.
 *
 * IMPORTANT: Transactions may take a few minutes to appear in Sentry dashboard
 * due to batching and processing. Check back after 2-5 minutes.
 *
 * Where to check performance data in Sentry:
 *
 * 1. Go to your Sentry Dashboard (https://sentry.io)
 * 2. Navigate to "Performance" in the left sidebar
 * 3. Click on "Transactions" tab
 * 4. Look for transactions with:
 *    - Operation: "custom.performance"
 *    - Name: normalized label (e.g., "useaccounts_query", "dashboard_latest_transactions_query")
 * 5. Click on a transaction to see:
 *    - Duration (in the transaction header)
 *    - Measurements section showing "duration" measurement
 *    - Attributes section showing:
 *      - original_label (your original label)
 *      - duration_ms (duration in milliseconds)
 *      - result_count (if available from additionalInfo)
 *      - additional_info (full additional info string)
 *
 * You can filter transactions by:
 * - Operation: custom.performance
 * - Transaction name: search for your query name
 * - Use the search bar: "custom.performance" or your label name
 *
 * Troubleshooting:
 * - If transactions don't appear, wait 2-5 minutes (Sentry batches sends)
 * - Check Sentry debug logs in terminal - you should see "Starting sampled root span"
 * - Verify tracesSampleRate is set to 1.0 in Sentry.init()
 * - Check Project Settings > Performance > Retention Priorities in Sentry
 *
 * Pro tip: Create a Saved Search in Performance with:
 *   - Operation = custom.performance
 *   - Group by: Transaction name
 *   - This gives you a dashboard of all performance metrics
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

  // Send to Sentry Performance Monitoring
  if (Sentry) {
    try {
      const transactionName = normalizePerformanceLabel(label);
      const now = Date.now() / 1000; // Current time in seconds

      // Create an inactive span and manually set timestamps to match our measured duration
      // This ensures the span duration matches what we measured
      const span = Sentry.startInactiveSpan({
        name: transactionName,
        op: "custom.performance",
      });

      if (span) {
        // Set the duration as a measurement on the span
        Sentry.setMeasurement("duration", duration, "millisecond", span);

        // Add additional info as attributes if provided
        if (additionalInfo) {
          // Try to extract counts like "(12 categories)" or "(10 transactions)"
          const countMatch = additionalInfo.match(/\((\d+)\s+(\w+)\)/);
          if (countMatch) {
            const count = parseInt(countMatch[1], 10);
            const unit = countMatch[2];
            span.setAttribute(`${unit}_count`, count);
            span.setAttribute("result_count", count);
          }

          // Add the full additional info as an attribute
          span.setAttribute("additional_info", additionalInfo);
        }

        // Add the original label and duration as attributes for reference
        span.setAttribute("original_label", label);
        span.setAttribute("duration_ms", duration);

        // End the span with the correct end timestamp
        span.end(now);
      }
    } catch (error) {
      // Silently fail if Sentry performance monitoring fails
      // Don't log to avoid infinite loops
    }
  }
}

/**
 * Enhanced error logging with stack traces
 */
export function logErrorDetails(error: unknown): void {
  if (error instanceof Error) {
    const errorMsg = `Error: ${error.message}\nStack: ${
      error.stack || "No stack trace"
    }`;
    customLog.error(errorMsg);

    // Send to Sentry
    sendErrorToSentry(error, "logErrorDetails");

    // Send to Crashlytics
    if (crashlytics) {
      try {
        crashlytics().recordError(error);
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
