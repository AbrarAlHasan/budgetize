# Backup System Implementation Plan

## Overview
Implement a complete backup system for the React Native Expo app that allows users to export all application data including SQLite database, MMKV storage, encryption key, and metadata.

## Goals
1. Create a comprehensive backup function that exports all app data
2. Package everything into a single ZIP file
3. Share the backup via system share dialog
4. Ensure production-ready code with proper error handling

## Technologies
- `expo-file-system` - File operations (already installed)
- `expo-sharing` - System share dialog (needs installation)
- `expo-secure-store` - Access encryption key (already installed)
- `react-native-zip-archive` - ZIP compression (needs installation)

## File Structure

### Files to Create
- `utils/backup.ts` - Main backup function

### Files to Modify
- `package.json` - Add dependencies

## Implementation Details

### 1. Dependencies Installation
**Required packages:**
- `expo-sharing` - For sharing the backup file
- `react-native-zip-archive` - For creating ZIP archives

**Installation:**
```bash
npx expo install expo-sharing
npm install react-native-zip-archive
```

### 2. File Paths

#### SQLite Database
- **Storage Key:** `'budgetize.db'` (from `db/sqlite/db.ts`)
- **Actual Path:** Expo SQLite stores databases in a location accessible via `FileSystem.documentDirectory`
- **Expected Path:** `FileSystem.documentDirectory + "SQLite/budgetize.db"` or similar
- **Note:** May need to verify actual path at runtime

#### MMKV Storage
- **Storage ID:** `'moneyManagerStorage'` (from `storage/mmkv.ts`)
- **Expected Path:** MMKV typically stores files in a directory based on the storage ID
- **Expected Path:** `FileSystem.documentDirectory + "mmkv/"` or platform-specific location
- **Note:** May need to verify actual path at runtime

#### Encryption Key
- **Storage Key:** `'budgetize_encryption_key'` (from `services/encryption.ts`)
- **Note:** User requirements mention `'encryption_key'` but code uses `'budgetize_encryption_key'`
- **Decision:** Use `'budgetize_encryption_key'` to match existing code

### 3. Backup Process Flow

```
1. Verify documentDirectory is available
   ↓
2. Create temporary backup directory: /backup-temp/
   ↓
3. Copy SQLite database file
   - Source: documentDirectory + "SQLite/budgetize.db" (or verify actual path)
   - Destination: backup-temp/database.sqlite
   ↓
4. Copy MMKV storage directory
   - Source: documentDirectory + "mmkv/" (or verify actual path)
   - Destination: backup-temp/mmkv/
   ↓
5. Read encryption key from SecureStore
   - Key: "budgetize_encryption_key"
   - Save as: backup-temp/encryption_key.txt
   ↓
6. Create metadata.json
   - createdAt: ISO timestamp
   - version: "1.0"
   ↓
7. Zip backup-temp/ directory
   - Output: documentDirectory + "backup.zip"
   ↓
8. Share backup.zip via system share dialog
   ↓
9. Clean up temporary directory (optional)
   ↓
10. Return ZIP file path
```

### 4. Error Handling Strategy

**Critical Errors:**
- Document directory not available → Throw error
- Database file not found → Log warning, continue (may be empty database)
- MMKV directory not found → Log warning, continue (may be empty)
- Encryption key not found → Log warning, continue (may not exist yet)
- ZIP creation fails → Throw error
- Sharing fails → Log error, return path anyway

**Error Recovery:**
- Always clean up temporary directory on error
- Return null on critical failures
- Log all errors with context

### 5. TypeScript Types

```typescript
interface BackupMetadata {
  createdAt: string; // ISO timestamp
  version: string;
}

interface BackupResult {
  success: boolean;
  zipPath: string | null;
  error?: string;
}
```

### 6. Function Signature

```typescript
export async function backupAppData(): Promise<string | null>
```

**Returns:**
- `string` - Path to backup.zip on success
- `null` - On failure

### 7. Implementation Considerations

#### File Path Discovery
Since exact file paths may vary:
1. Try common paths first
2. Use FileSystem.readDirectoryAsync to discover actual paths
3. Handle cases where files/directories don't exist yet

#### Platform Compatibility
- iOS: File paths work as expected
- Android: May need additional permissions (handled by Expo)
- Both: Ensure proper path separators

#### Performance
- Large databases may take time to copy
- Consider showing progress indicator (future enhancement)
- ZIP compression may be CPU-intensive

#### Security
- Encryption key is sensitive - ensure it's only in backup
- Backup file should be treated as sensitive data
- Consider adding password protection (future enhancement)

### 8. Testing Checklist

- [ ] Backup with existing data
- [ ] Backup with empty database
- [ ] Backup with missing MMKV directory
- [ ] Backup with missing encryption key
- [ ] Verify ZIP file structure
- [ ] Test sharing on iOS
- [ ] Test sharing on Android
- [ ] Verify metadata.json content
- [ ] Verify all files are included in ZIP

### 9. Future Enhancements (Out of Scope)

- Restore functionality
- Incremental backups
- Cloud backup integration
- Password protection for backups
- Backup scheduling
- Progress indicators
- Backup verification

## Implementation Steps

1. ✅ Create plan document (this file)
2. ✅ Install dependencies (expo-sharing, react-native-zip-archive)
3. ✅ Implement backupAppData() function
4. ✅ Add error handling and logging
5. ⏳ Test on iOS and Android
6. ✅ Document usage

## Post-Installation Steps

**Important:** Since `react-native-zip-archive` is a native module, you need to rebuild your native projects after installation:

```bash
# For iOS
npx expo prebuild --clean
npm run ios

# For Android
npx expo prebuild --clean
npm run android
```

Or if you're using Expo Prebuild already:
```bash
npx expo prebuild --clean
```

## Notes

- The user mentioned paths like `"SQLite/database.sqlite"` but the code uses `'budgetize.db'`
- We'll need to verify actual file paths at runtime
- The encryption key storage key differs from user requirements - using actual code value
- MMKV path may need platform-specific handling

