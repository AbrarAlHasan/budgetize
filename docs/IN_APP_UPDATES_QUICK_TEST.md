# Quick Testing Guide for In-App Updates

## Fastest Way to Test (Android - Internal App Sharing)

### Step 1: Prepare Two Builds

1. **Current version** (versionCode: 27) - This is your "old" version
2. **New version** (versionCode: 28) - This is your "update"

### Step 2: Build Both Versions

```bash
# First, update app.json to versionCode: 26 (or lower than current)
# Build the "old" version
eas build --platform android --profile production-apk

# Then, update app.json to versionCode: 27 (current) or higher
# Build the "new" version  
eas build --platform android --profile production-apk
```

### Step 3: Upload to Internal App Sharing

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Testing** → **Internal app sharing**
3. Upload the **old version APK** first
4. Upload the **new version APK** second
5. Copy both sharing links

### Step 4: Test on Device

1. Install the **old version** from the first link
2. Open the app - it should be running version 26
3. Install the **new version** from the second link (but don't open it)
4. Open the app again - you should see the update prompt!

### Step 5: Test Manual Check

1. Go to **Settings** → **App Updates**
2. Tap **Check for Updates**
3. Verify it detects the update

## Testing in Development Mode

The feature is disabled in `__DEV__` mode. To test the UI flow:

### Option 1: Create a Test Component

Create a temporary test screen to verify the UI:

```typescript
// app/test-updates.tsx (temporary file)
import { useInAppUpdates } from "@/hooks/use-in-app-updates";
import { Alert, Button, View, Text } from "react-native";

export default function TestUpdates() {
  const { checkAndPromptUpdate } = useInAppUpdates({ autoCheck: false });
  
  const handleTest = async () => {
    // This will show "Not Available" in dev mode, but you can see the UI
    await checkAndPromptUpdate(true);
  };
  
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text>Test In-App Updates</Text>
      <Button title="Check for Updates" onPress={handleTest} />
    </View>
  );
}
```

### Option 2: Temporarily Modify Hook (For Testing Only)

In `hooks/use-in-app-updates.ts`, temporarily allow dev mode:

```typescript
// TEMPORARY: Remove this before committing!
const checkForUpdate = useCallback(async (): Promise<UpdateCheckResult | null> => {
  // if (__DEV__ || Platform.OS === "web") {
  //   return null;
  // }
  
  // For testing, return a mock result
  if (__DEV__) {
    return {
      updateAvailable: true,
      daysSinceRelease: 3,
      releaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    };
  }
  
  // ... rest of code
}, []);
```

**⚠️ Remember to revert this before committing!**

## Quick Test Checklist

- [ ] Build old version (lower versionCode)
- [ ] Build new version (higher versionCode)  
- [ ] Upload both to Internal App Sharing
- [ ] Install old version on device
- [ ] Install new version (background)
- [ ] Open app - see update prompt
- [ ] Test manual check from Settings
- [ ] Verify update completes

## Current Configuration

- **Auto-check**: Enabled on app launch (after onboarding)
- **Days before prompt**: 2 days
- **Manual check**: Available in Settings → App Updates
- **Android versionCode**: 27 (in app.json)

## Next Steps for Production

1. **For iOS**: Add `AppStoreID` to `app.json` when ready:
   ```json
   "ios": {
     "infoPlist": {
       "AppStoreID": "YOUR_ID_HERE"
     }
   }
   ```

2. **For Android**: Ensure your app is published to Play Store
3. **Test with real users**: Use internal testing track

