# Cloud Backup Setup Guide

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Google OAuth credentials (for Google Sign-In)

## Step 1: Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note down your project URL and anon key from Settings > API

## Step 2: Configure Google OAuth

1. Go to Google Cloud Console (https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: 
     - `https://[your-project-ref].supabase.co/auth/v1/callback`
     - Add your app's deep link (e.g., `budgetize://`)
5. Copy Client ID and Client Secret

## Step 3: Configure Google OAuth Client ID

**Note**: This implementation uses `expo-auth-session` to get the ID token directly from Google, then authenticates with Supabase using `signInWithIdToken`. This approach does **NOT** require configuring OAuth in Supabase (no Client Secret needed).

1. **Get your Google OAuth Client ID**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project (or create a new one)
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - Choose **Web application** as the application type
   - Configure:
     - **Name**: Your app name (e.g., "Budgetize")
     - **Authorized JavaScript origins**: 
       - `https://[your-project-ref].supabase.co`
     - **Authorized redirect URIs**:
       - `budgetize://` (your app's deep link scheme - check app.json)
       - `exp://localhost:8081` (for development with Expo Go)
   - Click **Create**
   - **Copy the Client ID** (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)

2. **Set the Client ID in your app**:
   - Option 1: Add to `app.json`:
     ```json
     "extra": {
       "googleClientId": "YOUR_GOOGLE_CLIENT_ID_HERE"
     }
     ```
   - Option 2: Set as environment variable:
     ```bash
     EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
     ```

**Important**: You only need the Client ID, NOT the Client Secret. The app uses `expo-auth-session` to get the ID token directly from Google.

## Step 4: Create Storage Bucket

1. In Supabase Dashboard, go to Storage
2. Create a new bucket named `user-backups`
3. Set bucket to **Private**
4. Go to Policies tab and create a new policy:

**Policy Name:** `Users can manage their own backups`

**Policy Definition:**
```sql
-- Allow users to upload their own backups
CREATE POLICY "Users can upload their own backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to read their own backups
CREATE POLICY "Users can read their own backups"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own backups
CREATE POLICY "Users can delete their own backups"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-backups' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## Step 5: Configure Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Add `.env` to `.gitignore` to keep your keys secure!

## Step 6: Update app.json

The app.json already includes placeholders for Supabase config. The values will be read from environment variables.

## Step 7: Test the Integration

1. Run the app: `npm start`
2. Go to Settings
3. Tap "Login with Google"
4. Complete OAuth flow
5. Try uploading a backup
6. Check Supabase Storage to verify the backup was uploaded

## Troubleshooting

### OAuth redirect not working
- Make sure redirect URLs are correctly configured in both Google Console and Supabase
- Check that your app scheme matches (default: `budgetize://`)

### Storage upload fails
- Verify RLS policies are correctly set
- Check that bucket is named exactly `user-backups`
- Ensure user is authenticated before uploading

### Session not persisting
- Check that MMKV is properly installed
- Verify Supabase client configuration
- Ensure asyncStorage is correctly configured in storage/mmkv.ts
- Verify the redirect URL matches your app scheme (e.g., `budgetize://`)
- Check that the OAuth callback URL is being processed correctly

## Security Notes

- Never commit `.env` file to version control
- Keep your Supabase anon key secure (it's safe to use in client apps, but don't expose service role key)
- RLS policies ensure users can only access their own backups
- Backups are encrypted using your existing encryption key

