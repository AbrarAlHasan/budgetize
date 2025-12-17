/**
 * Firebase Performance Monitoring Service
 * Tracks SQL query performance using custom traces
 */

import { Platform } from "react-native";

// Lazy import Firebase Performance
let perf: any = null;
let isInitialized = false;

/**
 * Initialize Firebase Performance Monitoring
 * Should be called once at app startup
 * Works in both development and production modes
 */
export function initializePerformanceMonitoring(): void {
  if (isInitialized) return;
  
  try {
    if (Platform.OS !== "web") {
      // Store the function itself, not the result of calling it
      perf = require("@react-native-firebase/perf").default;
      isInitialized = true;
    }
  } catch (error) {
    // Performance monitoring not available, continue without it
    isInitialized = true; // Mark as initialized to prevent retries
  }
}

/**
 * Extract table name from SQL query
 */
function extractTableName(query: string): string {
  const normalizedQuery = query.trim().toUpperCase();
  
  // Try to extract table name from common SQL patterns
  const patterns = [
    /FROM\s+(\w+)/i,
    /INTO\s+(\w+)/i,
    /UPDATE\s+(\w+)/i,
    /JOIN\s+(\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }
  
  return "unknown";
}

/**
 * Determine query type from SQL statement
 */
function getQueryType(query: string): string {
  const normalizedQuery = query.trim().toUpperCase();
  
  if (normalizedQuery.startsWith("SELECT")) return "SELECT";
  if (normalizedQuery.startsWith("INSERT")) return "INSERT";
  if (normalizedQuery.startsWith("UPDATE")) return "UPDATE";
  if (normalizedQuery.startsWith("DELETE")) return "DELETE";
  
  return "OTHER";
}

/**
 * Create a sanitized query name for trace (removes parameters for privacy)
 */
function createTraceName(tableName: string, queryType: string): string {
  return `sql_${tableName}_${queryType.toLowerCase()}`;
}

/**
 * Track SQL query performance using Firebase Performance Monitoring
 * 
 * @param query - The SQL query string
 * @param params - Query parameters (for metadata only, not logged)
 * @param operation - The operation function to execute
 * @returns The result of the operation
 */
export async function trackQueryPerformance<T>(
  query: string,
  params: any[],
  operation: () => Promise<T>
): Promise<T> {
  // Skip tracking if not initialized or Firebase Performance not available
  if (!perf || !isInitialized) {
    return operation();
  }

  const tableName = extractTableName(query);
  const queryType = getQueryType(query);
  const traceName = createTraceName(tableName, queryType);
  
  let trace: any = null;
  const startTime = Date.now();

  try {
    // Start custom trace
    trace = perf().newTrace(traceName);
    await trace.start();

    // Add metadata to trace
    trace.putAttribute("table", tableName);
    trace.putAttribute("query_type", queryType);
    trace.putAttribute("has_params", params.length > 0 ? "true" : "false");
    
    // Execute the query
    const result = await operation();
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Add duration as metric
    trace.putMetric("duration_ms", duration);
    
    // Add result count if available (for SELECT queries)
    if (queryType === "SELECT" && Array.isArray(result)) {
      trace.putMetric("result_count", result.length);
    }
    
    // Stop trace
    await trace.stop();
    
    return result;
  } catch (error) {
    // If trace was started, mark it as failed
    if (trace) {
      try {
        trace.putAttribute("error", "true");
        trace.putAttribute("error_type", error instanceof Error ? error.constructor.name : "Unknown");
        await trace.stop();
      } catch (traceError) {
        // Silently fail if trace stop fails
      }
    }
    
    // Re-throw the original error
    throw error;
  }
}

/**
 * Track SQL update/insert/delete performance
 * Similar to trackQueryPerformance but optimized for write operations
 */
export async function trackUpdatePerformance<T>(
  query: string,
  params: any[],
  operation: () => Promise<T>
): Promise<T> {
  // Skip tracking if not initialized or Firebase Performance not available
  if (!perf || !isInitialized) {
    return operation();
  }

  const tableName = extractTableName(query);
  const queryType = getQueryType(query);
  const traceName = createTraceName(tableName, queryType);
  
  let trace: any = null;
  const startTime = Date.now();

  try {
    // Start custom trace
    trace = perf().newTrace(traceName);
    await trace.start();

    // Add metadata to trace
    trace.putAttribute("table", tableName);
    trace.putAttribute("query_type", queryType);
    trace.putAttribute("has_params", params.length > 0 ? "true" : "false");
    
    // Execute the update
    const result = await operation();
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Add duration as metric
    trace.putMetric("duration_ms", duration);
    
    // For INSERT operations, track lastInsertRowId if available
    if (queryType === "INSERT" && result && typeof result === "object" && "lastInsertRowId" in result) {
      trace.putMetric("inserted_id", (result as any).lastInsertRowId);
    }
    
    // Stop trace
    await trace.stop();
    
    return result;
  } catch (error) {
    // If trace was started, mark it as failed
    if (trace) {
      try {
        trace.putAttribute("error", "true");
        trace.putAttribute("error_type", error instanceof Error ? error.constructor.name : "Unknown");
        await trace.stop();
      } catch (traceError) {
        // Silently fail if trace stop fails
      }
    }
    
    // Re-throw the original error
    throw error;
  }
}

