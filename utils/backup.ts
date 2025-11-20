import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { zip } from 'react-native-zip-archive';
import { Platform } from 'react-native';

/**
 * Metadata structure for backup files
 */
interface BackupMetadata {
  createdAt: string;
  version: string;
}

/**
 * Finds the SQLite database file by checking common locations
 */
async function findDatabaseFile(documentDirectory: string): Promise<string | null> {
  const possiblePaths = [
    `${documentDirectory}SQLite/budgetize.db`,
    `${documentDirectory}budgetize.db`,
    `${documentDirectory}SQLite/database.sqlite`,
    `${documentDirectory}database.sqlite`,
  ];

  for (const path of possiblePaths) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && !info.isDirectory) {
        console.log(`Found database at: ${path}`);
        return path;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  // Try to discover by listing directories
  try {
    const sqliteDir = `${documentDirectory}SQLite/`;
    const sqliteDirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (sqliteDirInfo.exists && sqliteDirInfo.isDirectory) {
      const files = await FileSystem.readDirectoryAsync(sqliteDir);
      const dbFile = files.find((file) => file.endsWith('.db') || file.endsWith('.sqlite'));
      if (dbFile) {
        const dbPath = `${sqliteDir}${dbFile}`;
        console.log(`Found database at: ${dbPath}`);
        return dbPath;
      }
    }
  } catch (error) {
    console.warn('Could not discover database file:', error);
  }

  return null;
}

/**
 * Finds the MMKV storage directory by checking common locations
 */
async function findMMKVDirectory(documentDirectory: string): Promise<string | null> {
  const possiblePaths = [
    `${documentDirectory}mmkv/`,
    `${documentDirectory}MMKV/`,
    `${documentDirectory}react-native-mmkv/`,
  ];

  for (const path of possiblePaths) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && info.isDirectory) {
        console.log(`Found MMKV directory at: ${path}`);
        return path;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  // Try to discover by listing document directory
  try {
    const files = await FileSystem.readDirectoryAsync(documentDirectory);
    const mmkvDir = files.find((file) => 
      file.toLowerCase().includes('mmkv') || file.toLowerCase().includes('moneyManagerStorage')
    );
    if (mmkvDir) {
      const mmkvPath = `${documentDirectory}${mmkvDir}/`;
      const info = await FileSystem.getInfoAsync(mmkvPath);
      if (info.exists && info.isDirectory) {
        console.log(`Found MMKV directory at: ${mmkvPath}`);
        return mmkvPath;
      }
    }
  } catch (error) {
    console.warn('Could not discover MMKV directory:', error);
  }

  return null;
}

async function resolveDocumentDirectory(): Promise<string> {
  console.log('📁 FileSystem directories', {
    documentDirectory: FileSystem.documentDirectory,
    cacheDirectory: FileSystem.cacheDirectory,
    hasGetDocumentDirectoryAsync: typeof (FileSystem as any).getDocumentDirectoryAsync,
  });

  // Try direct access first
  if (FileSystem.documentDirectory) {
    return FileSystem.documentDirectory;
  }

  // Try async method if available (expo-file-system SDK 50+)
  if (typeof (FileSystem as any).getDocumentDirectoryAsync === 'function') {
    try {
      const dir = await (FileSystem as any).getDocumentDirectoryAsync();
      if (dir) {
        return dir.endsWith('/') ? dir : `${dir}/`;
      }
    } catch (error) {
      console.warn('getDocumentDirectoryAsync failed:', error);
    }
  }

  // Workaround: Try to discover by attempting to create a test file using legacy API
  try {
    const testFileName = 'backup-test-discovery.txt';
    const testContent = 'test';
    
    try {
      // Use legacy API for writeAsStringAsync
      await FileSystemLegacy.writeAsStringAsync(testFileName, testContent);
      
      // Get info about the file we just created
      const fileInfo = await FileSystem.getInfoAsync(testFileName);
      if (fileInfo.exists && fileInfo.uri) {
        // Extract the directory from the URI
        // URI format: file:///path/to/file.txt
        const uri = fileInfo.uri;
        const filePath = uri.replace('file://', '');
        const lastSlashIndex = filePath.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const baseDir = filePath.substring(0, lastSlashIndex + 1);
          // Clean up test file
          await FileSystem.deleteAsync(testFileName, { idempotent: true });
          // Return with file:// prefix
          return `file://${baseDir}`;
        }
      }
      
      // Clean up if we got here
      await FileSystem.deleteAsync(testFileName, { idempotent: true });
    } catch (error) {
      // Writing with relative path didn't work
      console.warn('Path discovery via test file failed:', error);
    }
  } catch (error) {
    console.warn('Path discovery failed:', error);
  }

  // Try using cacheDirectory as fallback
  if (FileSystem.cacheDirectory) {
    console.warn('⚠️  Document directory unavailable; falling back to cache directory');
    return FileSystem.cacheDirectory;
  }

  // Last resort: For development builds, try to use StorageAccessFramework
  // or construct path based on Platform
  throw new Error(
    'Document directory is not available. ' +
    'This may be a known issue with expo-file-system in development builds. ' +
    'Please try: 1) Restarting the app, 2) Using a production build, or 3) Updating expo-file-system.'
  );
}

/**
 * Creates a complete backup of the application data including:
 * - SQLite database
 * - MMKV storage directory
 * - Encryption key from SecureStore
 * - Metadata file (timestamp, version)
 * 
 * The backup is zipped and shared via the system share dialog.
 * 
 * @returns The path to the created backup.zip file, or null if backup failed
 */
export async function backupAppData(): Promise<string | null> {
  let backupTempDir: string | null = null;

  try {
    // Resolve document directory (works in dev client & bare apps)
    const documentDirectory = await resolveDocumentDirectory();

    console.log('📦 Starting backup process...');
    console.log(`📁 Document directory: ${documentDirectory}`);

    // Create temporary backup directory
    backupTempDir = `${documentDirectory}backup-temp/`;
    const backupZipPath = `${documentDirectory}backup.zip`;

    // Clean up any existing backup-temp directory
    try {
      const existingBackupInfo = await FileSystem.getInfoAsync(backupTempDir);
      if (existingBackupInfo.exists) {
        console.log('🧹 Cleaning up existing backup-temp directory...');
        await FileSystem.deleteAsync(backupTempDir, { idempotent: true });
      }
    } catch (error) {
      console.warn('Could not clean up existing backup-temp:', error);
    }

    // Create backup-temp directory
    console.log('📂 Creating backup-temp directory...');
    await FileSystem.makeDirectoryAsync(backupTempDir, { intermediates: true });

    // Step 1: Copy SQLite database
    console.log('💾 Looking for SQLite database...');
    const dbSourcePath = await findDatabaseFile(documentDirectory);
    if (dbSourcePath) {
      const dbDestPath = `${backupTempDir}database.sqlite`;
      console.log(`📋 Copying database from ${dbSourcePath} to ${dbDestPath}...`);
      await FileSystem.copyAsync({
        from: dbSourcePath,
        to: dbDestPath,
      });
      console.log('✅ Database copied successfully');
    } else {
      console.warn('⚠️  SQLite database file not found. Continuing without database backup.');
    }

    // Step 2: Copy MMKV storage directory
    console.log('📦 Looking for MMKV storage directory...');
    const mmkvSourceDir = await findMMKVDirectory(documentDirectory);
    if (mmkvSourceDir) {
      const mmkvDestDir = `${backupTempDir}mmkv/`;
      console.log(`📋 Copying MMKV directory from ${mmkvSourceDir} to ${mmkvDestDir}...`);
      await FileSystem.copyAsync({
        from: mmkvSourceDir,
        to: mmkvDestDir,
      });
      console.log('✅ MMKV directory copied successfully');
    } else {
      console.warn('⚠️  MMKV storage directory not found. Continuing without MMKV backup.');
    }

    // Step 3: Retrieve and save encryption key
    console.log('🔑 Retrieving encryption key from SecureStore...');
    // Note: Using the actual key from services/encryption.ts: 'budgetize_encryption_key'
    const encryptionKey = await SecureStore.getItemAsync('budgetize_encryption_key');
    if (encryptionKey) {
      const encryptionKeyPath = `${backupTempDir}encryption_key.txt`;
      console.log('💾 Saving encryption key...');
      await FileSystemLegacy.writeAsStringAsync(encryptionKeyPath, encryptionKey);
      console.log('✅ Encryption key saved successfully');
    } else {
      console.warn('⚠️  Encryption key not found in SecureStore. Continuing without encryption key backup.');
    }

    // Step 4: Create metadata file
    console.log('📝 Creating metadata file...');
    const metadata: BackupMetadata = {
      createdAt: new Date().toISOString(),
      version: '1.0',
    };
    const metadataPath = `${backupTempDir}metadata.json`;
    await FileSystemLegacy.writeAsStringAsync(
      metadataPath,
      JSON.stringify(metadata, null, 2)
    );
    console.log('✅ Metadata file created successfully');

    // Step 5: Zip the backup directory
    console.log('🗜️  Zipping backup directory...');
    await zip(backupTempDir, backupZipPath);
    console.log(`✅ Backup zipped successfully: ${backupZipPath}`);

    // Step 6: Clean up temporary directory
    console.log('🧹 Cleaning up temporary directory...');
    try {
      await FileSystem.deleteAsync(backupTempDir, { idempotent: true });
      console.log('✅ Temporary directory cleaned up');
    } catch (error) {
      console.warn('⚠️  Could not clean up temporary directory:', error);
    }

    // Step 7: Share the backup file
    console.log('📤 Sharing backup file...');
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(backupZipPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Export Backup',
      });
      console.log('✅ Backup shared successfully');
    } else {
      console.warn('⚠️  Sharing is not available on this platform');
    }

    console.log('🎉 Backup process completed successfully!');
    return backupZipPath;
  } catch (error) {
    console.error('❌ Error during backup process:', error);
    
    // Clean up temporary directory on error
    if (backupTempDir) {
      try {
        await FileSystem.deleteAsync(backupTempDir, { idempotent: true });
        console.log('🧹 Cleaned up temporary directory after error');
      } catch (cleanupError) {
        console.error('❌ Could not clean up temporary directory:', cleanupError);
      }
    }

    return null;
  }
}

