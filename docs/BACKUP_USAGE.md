# Backup System Usage Guide

## Overview

The backup system allows users to export all application data including:
- SQLite database
- MMKV storage directory
- Encryption key from SecureStore
- Metadata (timestamp, version)

## Installation

Dependencies are already installed:
- ✅ `expo-file-system`
- ✅ `expo-sharing`
- ✅ `expo-secure-store`
- ✅ `react-native-zip-archive`

**Important:** After installing `react-native-zip-archive`, rebuild native projects:

```bash
npx expo prebuild --clean
npm run ios  # or npm run android
```

## Usage

### Basic Usage

```typescript
import { backupAppData } from '@/utils/backup';

// In your component or function
const handleBackup = async () => {
  try {
    const zipPath = await backupAppData();
    if (zipPath) {
      console.log('Backup created successfully:', zipPath);
      // Backup was shared via system share dialog
    } else {
      console.error('Backup failed');
      // Show error message to user
    }
  } catch (error) {
    console.error('Backup error:', error);
  }
};
```

### Example: Add Backup Button to Settings

```typescript
import { Button } from '@/components/ui/button';
import { backupAppData } from '@/utils/backup';
import { Alert } from 'react-native';

export function BackupButton() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const zipPath = await backupAppData();
      if (zipPath) {
        Alert.alert('Success', 'Backup created and shared successfully!');
      } else {
        Alert.alert('Error', 'Failed to create backup. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during backup.');
      console.error(error);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <Button onPress={handleBackup} disabled={isBackingUp}>
      {isBackingUp ? 'Creating Backup...' : 'Export Backup'}
    </Button>
  );
}
```

## Function Signature

```typescript
export async function backupAppData(): Promise<string | null>
```

**Returns:**
- `string` - Path to `backup.zip` file on success
- `null` - On failure (errors are logged to console)

## Backup Contents

The backup ZIP file contains:

```
backup.zip
├── database.sqlite          # SQLite database file
├── mmkv/                     # MMKV storage directory
│   └── (MMKV files)
├── encryption_key.txt        # Encryption key from SecureStore
└── metadata.json            # Backup metadata
    {
      "createdAt": "2024-01-01T12:00:00.000Z",
      "version": "1.0"
    }
```

## Features

### Automatic File Discovery
The backup function automatically discovers:
- SQLite database file location (tries multiple common paths)
- MMKV storage directory location (tries multiple common paths)

### Error Handling
- Gracefully handles missing files/directories
- Continues backup even if some components are missing
- Logs all errors with context
- Cleans up temporary files on error

### Platform Support
- ✅ iOS
- ✅ Android
- Works with Expo Prebuild

## Notes

1. **Encryption Key:** The function uses the key `'budgetize_encryption_key'` (as defined in `services/encryption.ts`)

2. **File Paths:** The function tries multiple common paths for database and MMKV files. If files are not found, the backup continues without them (with warnings).

3. **Sharing:** The backup is automatically shared via the system share dialog. Users can save it to Files, share via email, etc.

4. **Temporary Files:** The `backup-temp/` directory is automatically cleaned up after the backup is created.

5. **Large Backups:** For large databases, the backup process may take some time. Consider showing a loading indicator.

## Troubleshooting

### Backup fails silently
- Check console logs for detailed error messages
- Verify that document directory is available
- Ensure app has file system permissions

### Database not found
- The database might not exist yet (first run)
- Check console logs to see which paths were tried
- Verify database is created before backup

### MMKV directory not found
- MMKV might not have created files yet
- This is okay - backup will continue without MMKV data

### Sharing not available
- Some platforms/simulators don't support sharing
- The backup file is still created at the returned path
- You can manually access it via file system

## Future Enhancements

Potential improvements (not implemented):
- Restore functionality
- Progress indicators
- Backup verification
- Incremental backups
- Cloud backup integration
- Password protection

