# Google OAuth Setup Guide

## Implementation Approach

This app uses `expo-auth-session` to get the Google ID token directly, then authenticates with Supabase using `signInWithIdToken`. This approach:
- ✅ Does NOT require configuring OAuth in Supabase (no Client Secret needed)
- ✅ Only needs Google Client ID
- ✅ More secure and simpler setup

## Setup Steps

### 1. Get Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Go to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application** as the application type
6. Configure:
   - **Name**: Your app name (e.g., "Budgetize")
   - **Authorized JavaScript origins**: 
     - `https://[your-project-ref].supabase.co`
   - **Authorized redirect URIs**:
     - `budgetize://` (your app's deep link scheme - check app.json)
     - `exp://localhost:8081` (for development with Expo Go)
7. Click **Create**
8. **Copy the Client ID** (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
   - ⚠️ **Note**: You only need the Client ID, NOT the Client Secret!

### 2. Configure Your App

**Option 1: Add to app.json** (Recommended for development):
```json
{
  "expo": {
    "extra": {
      "googleClientId": "YOUR_GOOGLE_CLIENT_ID_HERE"
    }
  }
}
```

**Option 2: Set as environment variable** (Recommended for production):
```bash
# Create a .env file or set in your CI/CD
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

### 3. Test the Login

1. Run your app: `npm start`
2. Go to Settings
3. Tap "Login with Google"
4. You should see Google's sign-in page
5. After signing in, you'll be authenticated with Supabase

## Common Issues

### Issue: "Google Client ID not configured"
- **Error**: `Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID...`
- **Solution**: 
  - Make sure you've set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` as an environment variable, OR
  - Added `googleClientId` to `app.json` > `extra`
  - Restart your Expo development server after adding the variable

### Issue: "No ID token received from Google OAuth"
- **Solution**: 
  - Verify your redirect URI matches exactly in Google Cloud Console
  - Check that your app scheme (`budgetize://`) is configured in `app.json`
  - Make sure the redirect URI in Google Cloud Console includes your app scheme

### Issue: "Failed to create session with Supabase"
- **Solution**: 
  - Verify your Supabase URL and anon key are correctly set
  - Check that Supabase project is active
  - Ensure you have internet connectivity

### Issue: "Redirect URL mismatch"
- **Solution**: Ensure the redirect URI in Google Cloud Console matches:
  - Your app scheme: `budgetize://` (check `app.json` for the `scheme` field)
  - For development: `exp://localhost:8081`

## Verification Checklist

- [ ] Google OAuth Client ID created in Google Cloud Console
- [ ] Client ID copied from Google Cloud Console
- [ ] Redirect URIs configured in Google Cloud Console:
  - [ ] `budgetize://` (or your app scheme)
  - [ ] `exp://localhost:8081` (for development)
- [ ] Client ID set in app (either `app.json` or environment variable)
- [ ] App scheme matches in `app.json` and Google Cloud Console
- [ ] Supabase URL and anon key configured
- [ ] Tested login flow

## Still Having Issues?

1. **Check your app.json scheme**:
   - Verify the `scheme` field matches your redirect URI
   - Example: `"scheme": "budgetize"` means redirect URI should be `budgetize://`

2. **Verify environment variables**:
   - If using `.env`, make sure it's loaded (may need `expo-constants` or similar)
   - Check that `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is accessible at runtime

3. **Check Google Cloud Console**:
   - Verify the Client ID is correct
   - Ensure redirect URIs are exactly matching (including protocol and path)

4. **Restart development server**:
   - After changing `app.json` or environment variables, restart Expo
   - Clear cache if needed: `expo start -c`

