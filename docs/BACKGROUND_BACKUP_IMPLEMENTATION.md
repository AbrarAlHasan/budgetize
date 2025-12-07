# Background Backup Implementation

## Overview
This document describes the implementation of automatic daily cloud backups that run in the background, even when the app is closed.

## Features
- ✅ Automatic daily backups at 10 PM
- ✅ Background execution (works when app is closed)
- ✅ Network connectivity checks
- ✅ User authentication validation
- ✅ Settings toggle to enable/disable
- ✅ Last backup timestamp tracking

## Architecture

### Components

#### 1. Background Task (`services/background-backup.ts`)
- Uses `expo-task-manager` to define the backup task
- Uses `expo-background-fetch` for background execution
- Handles network checks, authentication, and backup execution
- Stores last backup timestamp

#### 2. Scheduler
- Schedules daily notification at 10 PM using `expo-notifications`
- Registers background fetch task
- Manages task lifecycle (register/unregister)

#### 3. Settings Integration
- Toggle in Settings screen to enable/disable automatic backups
- Shows last backup timestamp
- Requires notification permissions

## How It Works

### Background Execution Flow

1. **Task Registration**: When automatic backups are enabled, the app registers a background fetch task
2. **Daily Notification**: A notification is scheduled for 10 PM daily
3. **Background Execution**: The OS runs the background task periodically (iOS: minimum 15 minutes, Android: system-determined)
4. **Backup Process**:
   - Checks network connectivity
   - Validates user authentication
   - Checks if automatic backups are enabled
   - Creates local backup
   - Uploads to Supabase Storage
   - Stores last backup timestamp

### Platform-Specific Behavior

#### iOS
- Background fetch runs periodically (minimum 15 minutes between runs)
- OS decides when to run based on usage patterns
- Notification at 10 PM serves as a trigger/reminder
- Requires `UIBackgroundModes` in `Info.plist` (configured in `app.json`)

#### Android
- Background fetch runs more frequently
- System optimizations may affect execution
- Notification at 10 PM serves as a trigger/reminder
- Works better when device is charging or on WiFi

## Configuration

### App Configuration (`app.json`)
```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": [
        "background-fetch",
        "remote-notification"
      ]
    }
  }
}
```

### Permissions Required
- **Notifications**: Required for scheduling daily backup notifications
- **Background Fetch**: Required for background task execution
- **Network**: Required for uploading backups

## Usage

### Enabling Automatic Backups

1. Go to Settings → Account section
2. Toggle "Automatic Daily Backup" switch
3. Grant notification permissions if prompted
4. Backups will start running daily at 10 PM

### Disabling Automatic Backups

1. Go to Settings → Account section
2. Toggle "Automatic Daily Backup" switch to OFF
3. Background task and notifications will be cancelled

## API Reference

### Functions

#### `initializeBackupScheduler()`
Initializes the backup scheduler on app startup. Should be called in `app/_layout.tsx`.

#### `enableAutomaticBackups()`
Enables automatic daily backups:
- Registers background fetch task
- Schedules daily notification at 10 PM
- Stores preference in SecureStore

#### `disableAutomaticBackups()`
Disables automatic daily backups:
- Unregisters background fetch task
- Cancels daily notification
- Removes preference from SecureStore

#### `isAutomaticBackupEnabled()`
Returns whether automatic backups are currently enabled.

#### `getLastBackupTimestamp()`
Returns the timestamp of the last successful backup.

## Limitations

### iOS
- Background fetch runs periodically, not at exact times
- OS decides execution timing based on usage patterns
- May not run if device is in low power mode
- Minimum interval is 15 minutes

### Android
- System optimizations may delay or skip background tasks
- Battery optimization settings may affect execution
- Works better when device is charging

### General
- Requires network connectivity
- Requires user to be authenticated
- Backup may be delayed if device is offline
- Notification at 10 PM is a trigger, actual execution depends on OS

## Troubleshooting

### Backups Not Running
1. Check if automatic backups are enabled in Settings
2. Verify notification permissions are granted
3. Check network connectivity
4. Ensure user is authenticated
5. Check device battery optimization settings (Android)
6. Verify background app refresh is enabled (iOS)

### Testing
- Use Expo's development build to test background tasks
- Background tasks don't work in Expo Go
- Test on physical devices (not simulators/emulators)
- Allow some time for OS to schedule the task

## Future Improvements
- Add backup frequency options (daily, weekly, monthly)
- Add custom backup time selection
- Add backup status notifications
- Add backup failure alerts
- Add backup size information
- Add backup history view

