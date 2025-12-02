# In-App Updates Testing Guide

This guide explains how to test the in-app updates feature on both Android and iOS platforms.

## Prerequisites

- Your app must be published to Google Play Store (for Android) or App Store (for iOS) at least once
- You need access to Google Play Console (for Android) or App Store Connect (for iOS)
- For Android: You need to be part of an internal testing track or use Internal App Sharing
- For iOS: You need TestFlight access

## Android Testing

### Method 1: Internal App Sharing (Recommended for Quick Testing)

Internal App Sharing is the fastest way to test in-app updates on Android.

#### Step 1: Build Two Versions

1. **Build the base version** (lower version code):
   ```bash
   # Update app.json to have a lower versionCode (e.g., 26)
   # Then build
   eas build --platform android --profile production
   ```

2. **Build the update version** (higher version code):
   ```bash
   # Update app.json to have a higher versionCode (e.g., 27)
   # Make some visible changes to verify the update
   # Then build
   eas build --platform android --profile production
   ```

#### Step 2: Upload to Internal App Sharing

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Testing** → **Internal app sharing**
3. Upload the **base version** (lower version code) first
4. Upload the **update version** (higher version code) second
5. Copy the sharing links for both versions

#### Step 3: Install and Test

1. **Install the base version** on your Android device:
   - Open the sharing link for the base version
   - Install the app
   - Open the app and verify it's running

2. **Install the update version** (but don't open it):
   - Open the sharing link for the update version
   - Install it (this will update the app in the background)

3. **Test the update flow**:
   - Open the app (the base version)
   - The app should automatically check for updates on launch
   - You should see the update prompt or immediate update flow

#### Step 4: Test Manual Check

1. Open the app
2. Go to **Settings** → **App Updates**
3. Tap **Check for Updates**
4. Verify the update check works correctly

### Method 2: Internal Testing Track

1. Create an internal testing track in Google Play Console
2. Upload both versions to the internal testing track
3. Add testers to the track
4. Testers install the base version, then the update version becomes available
5. The in-app update should trigger when they open the app

### Android Testing Notes

- **Flexible Updates**: The app will download in the background and prompt to restart
- **Immediate Updates**: The app will show a full-screen update dialog that blocks usage
- **Update Availability**: Updates must be available in Google Play for at least a few minutes before they're detected
- **Version Code**: The update version must have a higher `versionCode` in `app.json`

## iOS Testing

### Prerequisites

1. Your app must be published to the App Store at least once
2. You need the App Store ID (found in App Store Connect or your app's App Store URL)
3. Add the App Store ID to `app.json`:
   ```json
   {
     "expo": {
       "ios": {
         "infoPlist": {
           "AppStoreID": "YOUR_APP_STORE_ID"
         }
       }
     }
   }
   ```

### Step 1: Build Two Versions

1. **Build the base version** (lower version):
   ```bash
   # Update app.json to have a lower version (e.g., "1.0.0")
   # Then build
   eas build --platform ios --profile production
   ```

2. **Publish the base version** to App Store:
   - Submit the build to App Store Connect
   - Wait for it to be approved and published

3. **Build the update version** (higher version):
   ```bash
   # Update app.json to have a higher version (e.g., "1.0.1")
   # Make some visible changes
   # Then build
   eas build --platform ios --profile production
   ```

4. **Publish the update version** to App Store:
   - Submit the build to App Store Connect
   - Wait for it to be approved and published

### Step 2: Test with TestFlight

1. **Install the base version**:
   - Add the base version to TestFlight
   - Install it on your iOS device via TestFlight
   - Open the app and verify it's running

2. **Add the update version to TestFlight**:
   - Add the update version to TestFlight
   - The update should be available in TestFlight

3. **Test the update check**:
   - Open the app (base version)
   - The app should check for updates
   - Since iOS doesn't support native in-app updates, it will guide users to the App Store

### iOS Testing Notes

- iOS doesn't support native in-app updates like Android
- The module will detect if a newer version is available in the App Store
- Users will be directed to the App Store to update manually
- The iTunes Search API may have a delay (wait a few minutes after publishing)

## Development Testing

To test the update flow in development mode, you can temporarily modify the hook:

### Option 1: Temporarily Disable Dev Check

In `hooks/use-in-app-updates.ts`, temporarily comment out the dev check:

```typescript
const checkForUpdate = useCallback(async (): Promise<UpdateCheckResult | null> => {
  // Temporarily disabled for testing
  // if (__DEV__ || Platform.OS === "web") {
  //   return null;
  // }

  try {
    const result = await ExpoInAppUpdates.checkForUpdate();
    // ... rest of the code
  }
}, []);
```

**⚠️ Important**: Remember to re-enable this check before committing!

### Option 2: Use Production Build Locally

Build a production version and install it on your device:

```bash
# For Android
eas build --platform android --profile production --local

# For iOS
eas build --platform ios --profile production --local
```

Then install the APK/IPA on your device and test.

## Testing Checklist

### Android
- [ ] Base version installs correctly
- [ ] Update version is available in Play Store/Internal Sharing
- [ ] Automatic update check triggers on app launch
- [ ] Update prompt appears (after 2 days or when manually triggered)
- [ ] Flexible update downloads in background
- [ ] Immediate update shows full-screen dialog (for 2+ day old updates)
- [ ] Manual check from Settings works
- [ ] Update completes successfully
- [ ] App restarts with new version

### iOS
- [ ] App Store ID is configured in app.json
- [ ] Base version is published to App Store
- [ ] Update version is published to App Store
- [ ] Update check detects new version
- [ ] User is directed to App Store
- [ ] Manual check from Settings works

## Troubleshooting

### Android: Update Not Detected

1. **Wait a few minutes**: Updates may take time to propagate
2. **Check version code**: Ensure update version has higher `versionCode`
3. **Verify Play Store**: Ensure the update is actually available in Play Store
4. **Check logs**: Look for errors in Metro/device logs
5. **Clear app data**: Sometimes clearing app data helps

### iOS: Update Not Detected

1. **Verify App Store ID**: Check that `AppStoreID` is correct in `app.json`
2. **Wait for propagation**: iTunes Search API may have delays (wait 5-10 minutes)
3. **Check App Store**: Verify the update is actually live in App Store
4. **Rebuild**: You may need to rebuild after adding App Store ID

### General Issues

1. **No update prompt**: Check that `daysBeforePrompt` is set correctly (default: 2 days)
2. **Update fails**: Check device logs for specific error messages
3. **Development mode**: Remember the feature is disabled in `__DEV__` mode

## Quick Test Script

For quick testing, you can create a test button that bypasses the 2-day delay:

```typescript
// In your test component
const { checkAndPromptUpdate } = useInAppUpdates({ 
  autoCheck: false,
  daysBeforePrompt: 0 // Set to 0 for immediate testing
});
```

## Additional Resources

- [expo-in-app-updates GitHub](https://github.com/SohelIslamImran/expo-in-app-updates)
- [Android In-App Updates Guide](https://developer.android.com/guide/playcore/in-app-updates)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

