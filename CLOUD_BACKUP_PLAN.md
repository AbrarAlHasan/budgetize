# Cloud Backup Feature Implementation Plan

## Overview
Implement a cloud backup feature using Supabase for authentication (Google OAuth) and storage. Users can backup their data to the cloud and restore from any of the latest 3 backups.

## Features
1. **Google OAuth Login** - Authenticate users via Supabase
2. **Cloud Backup** - Upload backups to Supabase Storage
3. **Backup Management** - Maintain maximum 3 backups (latest 3)
4. **Backup Restore** - Restore from any of the 3 available backups
5. **Settings Integration** - All features accessible from Settings screen

## Architecture

### 1. Supabase Setup

#### Authentication
- **Provider**: Google OAuth
- **Configuration**: 
  - Enable Google OAuth in Supabase Dashboard
  - Configure OAuth credentials (Client ID, Client Secret)
  - Set redirect URLs for mobile app

#### Storage
- **Bucket Name**: `user-backups`
- **Policy**: 
  - Users can only access their own backups
  - RLS (Row Level Security) enabled
  - Storage path: `{userId}/backup-{timestamp}.zip`

### 2. File Structure

```
services/
  ├── supabase/
  │   ├── client.ts          # Supabase client initialization
  │   ├── auth.ts            # Authentication functions
  │   └── storage.ts         # Storage operations (upload/download/delete)
  
store/
  ├── auth-store.ts          # Auth state management (Zustand)
  
components/
  ├── cloud-backup/
  │   ├── login-button.tsx   # Google OAuth login button
  │   ├── backup-list.tsx    # List of available backups
  │   └── backup-item.tsx    # Individual backup item with restore option
  
utils/
  ├── cloud-backup.ts        # Cloud backup/restore functions
```

### 3. Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@react-native-google-signin/google-signin": "^11.0.0", // Optional: if using native Google Sign-In
    "expo-auth-session": "^5.0.0", // For OAuth flow
    "expo-web-browser": "^12.0.0"  // For OAuth redirect
  }
}
```

### 4. Implementation Steps

#### Step 1: Supabase Configuration
1. Create Supabase project
2. Enable Google OAuth provider
3. Create storage bucket `user-backups`
4. Set up RLS policies
5. Get project URL and anon key

#### Step 2: Environment Variables
Create `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Step 3: Supabase Client Setup
- Initialize Supabase client
- Configure auth and storage

#### Step 4: Authentication Store
- Create Zustand store for auth state
- Functions: login, logout, checkSession
- Store user session

#### Step 5: Cloud Backup Service
- Upload backup to Supabase Storage
- List user backups (max 3)
- Delete old backups when limit exceeded
- Download and restore backup

#### Step 6: UI Components
- Login button component
- Cloud backup section in settings
- Backup list with restore options
- Loading states and error handling

#### Step 7: Settings Integration
- Add "Cloud Backup" section
- Show login button when not authenticated
- Show backup options when authenticated
- Warning message when not logged in

## Detailed Implementation

### 1. Supabase Client (`services/supabase/client.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: asyncStorage, // Use MMKV asyncStorage for session persistence
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 2. Authentication Store (`store/auth-store.ts`)

```typescript
interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}
```

### 3. Cloud Backup Service (`utils/cloud-backup.ts`)

Functions:
- `uploadBackupToCloud()` - Upload backup ZIP to Supabase Storage
- `listCloudBackups()` - Get list of user's backups (sorted by date, limit 3)
- `downloadBackupFromCloud()` - Download backup ZIP from Supabase
- `deleteCloudBackup()` - Delete a specific backup
- `cleanupOldBackups()` - Delete backups beyond the 3 latest

### 4. Settings UI Structure

```
Settings Screen
├── Account Section
│   ├── Login with Google (if not logged in)
│   └── Logout (if logged in)
│
└── Cloud Backup Section
    ├── Status: Logged in / Not logged in
    ├── Warning: "To use this feature, please login" (if not logged in)
    ├── Upload Backup Button (disabled if not logged in)
    └── Backup List (if logged in)
        ├── Backup 1 (latest) - [Restore] [Delete]
        ├── Backup 2 - [Restore] [Delete]
        └── Backup 3 (oldest) - [Restore] [Delete]
```

## Security Considerations

1. **RLS Policies**: Ensure users can only access their own backups
2. **Encryption**: Backups are already encrypted (existing encryption key)
3. **Token Management**: Secure storage of auth tokens
4. **Error Handling**: Don't expose sensitive error messages

## User Flow

### Login Flow
1. User taps "Login with Google" in Settings
2. OAuth flow opens browser/WebView
3. User authenticates with Google
4. Redirect back to app with auth code
5. Exchange code for session
6. Store session in MMKV (via asyncStorage)
7. Update auth store

### Backup Flow
1. User taps "Upload Backup to Cloud"
2. Create local backup (using existing `backupAppData()`)
3. Upload ZIP to Supabase Storage
4. Check if user has > 3 backups
5. If yes, delete oldest backup
6. Show success message

### Restore Flow
1. User taps "Restore" on a backup
2. Download backup ZIP from Supabase
3. Use existing `restoreAppData()` function
4. Show success message

## Error Handling

- Network errors
- Authentication failures
- Storage quota exceeded
- Backup upload/download failures
- Session expiration

## Testing Checklist

- [ ] Google OAuth login works
- [ ] Session persists after app restart
- [ ] Logout clears session
- [ ] Backup uploads successfully
- [ ] Only 3 backups are kept (oldest deleted)
- [ ] Backup restore works
- [ ] UI shows correct states (logged in/out)
- [ ] Warning message shows when not logged in
- [ ] Cloud backup section is disabled when not logged in

## Future Enhancements

1. Automatic backups (scheduled)
2. Backup encryption at rest (additional layer)
3. Backup metadata (size, date, transaction count)
4. Backup comparison/diff
5. Multiple device sync

