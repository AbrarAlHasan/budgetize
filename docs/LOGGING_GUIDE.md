# Production Logging Guide

## Overview

The app now includes comprehensive production logging with multiple viewing options:

1. **Firebase Crashlytics** - For errors and warnings (automatic)
2. **File-based Logging** - For detailed logs that can be exported
3. **Console Logging** - For development only

## Where to View Logs

### 1. Firebase Crashlytics (Recommended for Production)

**Best for:** Errors, warnings, and crash reports

**How to Access:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `budgetize-46bd7`
3. Navigate to **Crashlytics** in the left sidebar
4. View logs, errors, and crash reports with stack traces

**What You'll See:**
- All `logError()` calls
- All `logWarn()` calls
- Automatic crash reports
- User device information
- Stack traces for errors

**Advantages:**
- Real-time error tracking
- Automatic crash reporting
- User analytics and device info
- No manual export needed
- Free tier available

### 2. File-based Logs (For Detailed Debugging)

**Best for:** Detailed debugging, info logs, and full log history

**How to Access:**
1. Open the app on your device
2. Go to **Settings**
3. Tap the "Settings" title 5 times to enable Developer Options
4. Scroll to **Developer Options**
5. Tap **Export Logs** to share the log file
6. The log file can be opened in any text editor

**What You'll See:**
- All log levels (debug, info, warn, error)
- Timestamps for each log entry
- Full log history (last 10 days, max 5MB per file)
- SQL queries (if logged)
- Performance metrics

**File Location:**
- Logs are stored in: `{DocumentDirectory}/logs/`
- Files are named: `app-YYYY-MM-DD.log`
- Old files are automatically cleaned up (keeps last 10 files)

### 3. Console Logs (Development Only)

**Best for:** Development and debugging

**How to Access:**
- Run `npx expo start` and view logs in terminal
- Or use React Native Debugger

**Note:** Console logs are disabled in production builds for performance.

## Log Levels

The logger supports four log levels:

```typescript
log("Debug message");           // Debug - detailed info (dev only)
logInfo("Info message");        // Info - general information
logWarn("Warning message");     // Warn - warnings
logError("Error message");      // Error - errors
```

### Where Each Level Goes:

- **Debug**: Console (dev only) + File logs (production)
- **Info**: Console (dev only) + File logs (production)
- **Warn**: Console (dev only) + Firebase Crashlytics + File logs (production)
- **Error**: Console (dev only) + Firebase Crashlytics + File logs (production)

## Usage Examples

### Basic Logging

```typescript
import { logInfo, logWarn, logError } from "@/utils/logger";

// Info log (file only in production)
logInfo("User logged in successfully");

// Warning (Firebase + file in production)
logWarn("Network request took longer than expected");

// Error (Firebase + file in production)
logError("Failed to save transaction:", error);
```

### Error Logging with Details

```typescript
import { logErrorDetails } from "@/utils/logger";

try {
  // Some code
} catch (error) {
  logErrorDetails(error); // Automatically sends to Crashlytics
}
```

### Performance Logging

```typescript
import { logPerformance } from "@/utils/logger";

const startTime = Date.now();
// ... do something ...
logPerformance("Database Query", Date.now() - startTime, "transactions table");
```

## Exporting Logs

### From the App:

1. Enable Developer Options (tap "Settings" title 5 times)
2. Go to **Developer Options**
3. Tap **Export Logs**
4. Share via email, messaging, or cloud storage

### Programmatically:

```typescript
import { getLatestLogFile, getAllLogFiles } from "@/utils/logger";

// Get most recent log file
const latestLog = await getLatestLogFile();

// Get all log files
const allLogs = await getAllLogFiles();
```

## Log File Management

- **Max file size**: 5MB per file
- **File rotation**: Automatic when file exceeds size limit
- **Retention**: Last 10 log files are kept
- **Cleanup**: Old files are automatically deleted

## Firebase Crashlytics Setup

Firebase Crashlytics is already configured in the app. To view logs:

1. Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are properly configured
2. Logs are automatically sent to Firebase when errors/warnings occur
3. No additional setup needed - it works automatically in production builds

## Best Practices

1. **Use appropriate log levels:**
   - `logInfo()` for general information
   - `logWarn()` for warnings that should be tracked
   - `logError()` for errors that need attention

2. **Don't log sensitive data:**
   - Avoid logging passwords, tokens, or personal information
   - Logs may be exported or sent to Firebase

3. **Use structured logging:**
   - Include context in log messages
   - Use consistent message formats

4. **Performance considerations:**
   - File logging is async and won't block the UI
   - Firebase logging is also async
   - Logs are batched for efficiency

## Troubleshooting

### Logs not appearing in Firebase:

1. Check that Firebase is properly initialized
2. Ensure the app is a production build (not development)
3. Wait a few minutes for logs to sync
4. Check Firebase Console for any errors

### Log files not being created:

1. Ensure the app has file system permissions
2. Check that it's a production build (logs are only created in production)
3. Verify storage space is available

### Export Logs button not working:

1. Ensure Developer Options are enabled
2. Check that sharing is available on the device
3. Verify log files exist (button will show message if none found)

## Summary

- **For quick error tracking**: Use Firebase Crashlytics (automatic)
- **For detailed debugging**: Export log files from Developer Options
- **For development**: Use console logs in terminal

All three methods work together to provide comprehensive logging coverage for your app!

