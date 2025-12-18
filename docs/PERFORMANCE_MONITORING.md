# SQL Query Performance Monitoring

## Overview

The app now tracks SQL query performance using Firebase Performance Monitoring. This allows you to monitor query timings in production and identify slow queries that need optimization.

## How It Works

### Automatic Tracking

Performance tracking happens at two levels:

#### 1. SQL Query Level (Repository Layer)

All SQL queries executed through the repository layer are automatically tracked:

- **BaseRepository.executeQuery()** - Tracks SELECT queries
- **BaseRepository.executeUpdate()** - Tracks INSERT, UPDATE, DELETE queries
- **QueryExecutor.executeQuery()** - Tracks custom SQL queries

#### 2. Application Level (Performance Logging)

All `logPerformance()` calls automatically send traces to Firebase Performance Monitoring:

- **Dashboard operations** - Query fetching, decryption, filtering
- **Category operations** - Loading, decrypting categories
- **Widget sync operations** - Widget data synchronization
- **Any custom performance logging** - All `logPerformance()` calls are tracked

### What Gets Tracked

For each query, Firebase Performance Monitoring records:

1. **Trace Name**: Format `sql_{table_name}_{query_type}`

   - Example: `sql_transactions_select`, `sql_accounts_insert`

2. **Attributes**:

   - `table`: Table name (e.g., "transactions", "accounts")
   - `query_type`: Type of query (SELECT, INSERT, UPDATE, DELETE)
   - `has_params`: Whether the query has parameters ("true" or "false")
   - `error`: Set to "true" if query failed
   - `error_type`: Type of error if query failed

3. **Metrics**:
   - `duration_ms`: Query execution time in milliseconds
   - `result_count`: Number of rows returned (for SELECT queries)
   - `inserted_id`: Last inserted row ID (for INSERT queries)

## Viewing Performance Data

### Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `budgetize-46bd7`
3. Navigate to **Performance** in the left sidebar
4. Click on **Traces** tab
5. Look for traces starting with `sql_`

### Trace Details

Each trace shows:

- **Duration**: Average, P50, P75, P95, P99 percentiles
- **Count**: Number of times the query was executed
- **Attributes**: Table name, query type, etc.
- **Metrics**: Duration, result counts, etc.

### Filtering Slow Queries

To find slow queries:

1. In Firebase Console, go to **Performance > Traces**
2. Sort by **P95 duration** (95th percentile)
3. Look for queries with high duration values
4. Click on a trace to see detailed metrics and attributes

## Example Trace Names

### SQL Query Traces

- `sql_transactions_select` - SELECT queries on transactions table
- `sql_accounts_insert` - INSERT queries on accounts table
- `sql_categories_update` - UPDATE queries on categories table
- `sql_tags_delete` - DELETE queries on tags table

### Application Performance Traces

- `dashboard_query_fetch` - Dashboard query fetching operations
- `dashboard_decrypt` - Dashboard data decryption
- `dashboard_filter` - Dashboard filtering operations
- `dashboard_latest_transactions_query_completed` - Complete dashboard query cycle
- `usecategories_decrypt` - Category decryption operations
- `usecategories_query_completed` - Category query completion

## Development vs Production

- **Both Modes**: Performance monitoring is **enabled** in both development and production
- **Firebase Console**: Traces from both dev and production builds appear in Firebase Console
- **Testing**: You can test performance tracking locally during development

## Performance Impact

- Minimal overhead: ~1-2ms per query
- Traces are sent asynchronously (non-blocking)
- No impact on query execution time
- Data is batched and sent periodically

## Troubleshooting

### Traces Not Appearing

1. **Check Firebase Setup**: Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are properly configured
2. **Wait Time**: Traces may take a few minutes to appear in Firebase Console
3. **Initialization**: Ensure `initializePerformanceMonitoring()` is called early in app startup (already done in `app/_layout.tsx`)
4. **Platform**: Ensure you're not running on web (Performance Monitoring doesn't work on web)

### High Query Times

If you see slow queries in Firebase:

1. **Check Query Complexity**: Look at the query structure - are there missing indexes?
2. **Check Result Count**: High `result_count` values may indicate inefficient queries
3. **Check Table Size**: Large tables may need optimization
4. **Review Query Logic**: Consider if the query can be optimized or if data can be cached

### Missing Traces

Some queries may not be tracked if they:

- Are executed directly on the database instance (bypassing repository methods)
- Fail before the trace can be started
- Are executed on web platform (Performance Monitoring doesn't work on web)

## Best Practices

1. **Monitor Regularly**: Check Firebase Performance weekly to identify slow queries
2. **Set Alerts**: Use Firebase alerts to notify you when query times exceed thresholds
3. **Optimize Gradually**: Focus on queries with high P95/P99 durations first
4. **Review Indexes**: Ensure frequently queried columns have indexes
5. **Consider Caching**: For frequently accessed data, consider caching strategies

## Implementation Details

### Service Location

- **Service**: `services/performance-monitor.ts`
- **Integration**: `repositories/base.repository.ts`
- **Initialization**: `app/_layout.tsx`

### Custom Traces

The service uses Firebase Performance Monitoring's custom trace API:

```typescript
const trace = perf().trace(traceName);
await trace.start();
// ... execute query ...
trace.putMetric("duration_ms", duration);
await trace.stop();
```

### Privacy

- Query parameters are **not** logged (only metadata)
- Table names and query types are tracked (safe metadata)
- No sensitive data is sent to Firebase

## Summary

SQL query performance monitoring is now automatically enabled for all production builds. Check Firebase Console regularly to identify and optimize slow queries, ensuring your app maintains excellent performance as your user base grows.
