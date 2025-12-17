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

// Firebase Performance Monitoring (lazy import)
let perf: any = null;
let perfInitialized = false;
try {
  if (Platform.OS !== "web") {
    perf = require("@react-native-firebase/perf").default;
    perfInitialized = true;
  }
} catch (error) {
  // Performance monitoring not available, continue without it
  perfInitialized = true;
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
 * Normalize performance label to a valid Firebase trace name
 * Firebase trace names must be lowercase, alphanumeric, and underscores only
 * 
 * Handles patterns like:
 * - "useAccounts_query" -> "use_accounts_query"
 * - "useAccount_query" -> "use_account_query"
 * - "Dashboard_latest_transactions_query" -> "dashboard_latest_transactions_query"
 */
function normalizeTraceName(label: string): string {
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
  
  // Remove "query" word if it appears separately (we'll add _query suffix)
  normalized = normalized.replace(/\s+query\s+/gi, " ").replace(/\s+query$/i, "");
  
  // Convert to lowercase and replace spaces/special chars with underscores
  normalized = normalized
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
  
  // Add "_query" suffix if it doesn't already have it
  if (normalized && !normalized.endsWith("_query")) {
    normalized = `${normalized}_query`;
  }
  
  // Limit length (Firebase has a max length for trace names)
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100);
  }
  
  // Ensure it starts with a letter
  if (normalized && /^[0-9]/.test(normalized)) {
    normalized = `trace_${normalized}`;
  }
  
  return normalized || "performance_trace";
}

/**
 * Extract metadata from additionalInfo string
 */
function parseAdditionalInfo(additionalInfo?: string): { [key: string]: string | number } {
  const metadata: { [key: string]: string | number } = {};
  
  if (!additionalInfo) return metadata;
  
  // Try to extract counts like "(12 categories)" or "(10 transactions)"
  const countMatch = additionalInfo.match(/\((\d+)\s+(\w+)\)/);
  if (countMatch) {
    const count = parseInt(countMatch[1], 10);
    const unit = countMatch[2];
    metadata[`${unit}_count`] = count;
    metadata.result_count = count;
  }
  
  return metadata;
}

/**
 * Logs performance metrics and sends to Firebase Performance Monitoring
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

  // Send to Firebase Performance Monitoring if available (fire-and-forget)
  if (perf && perfInitialized && duration >= 0) {
    // Use setImmediate to avoid blocking the current execution
    setImmediate(async () => {
      try {
        const traceName = normalizeTraceName(label);
        const trace = perf().newTrace(traceName);
        await trace.start();

        // Add duration as metric
        trace.putMetric("duration_ms", duration);

        // Add label as attribute
        trace.putAttribute("label", label);

        // Parse and add metadata from additionalInfo
        const metadata = parseAdditionalInfo(additionalInfo);
        Object.entries(metadata).forEach(([key, value]) => {
          if (typeof value === "number") {
            trace.putMetric(key, value);
          } else {
            trace.putAttribute(key, String(value));
          }
        });

        // Stop trace
        await trace.stop();
      } catch (error) {
        // Silently fail if Performance Monitoring fails
        // Don't log to avoid infinite loops
      }
    });
  }
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
