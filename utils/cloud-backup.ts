import { createBackupFile, restoreAppData } from './backup';
import { uploadBackup, listBackups, downloadBackup, cleanupOldBackups, CloudBackup } from '@/services/supabase/storage';
import { Paths } from 'expo-file-system';

/**
 * Upload local backup to cloud
 */
export async function uploadBackupToCloud(userId: string): Promise<{ error: Error | null; success: boolean }> {
  try {
    // 1. Create local backup file (without sharing)
    const localBackupPath = await createBackupFile();
    if (!localBackupPath) {
      return { error: new Error('Failed to create local backup'), success: false };
    }

    // 2. Upload to Supabase Storage
    const { error: uploadError, path } = await uploadBackup(localBackupPath, userId);
    if (uploadError || !path) {
      return { error: uploadError || new Error('Failed to upload backup'), success: false };
    }

    // 3. Clean up old backups (keep only latest 3)
    await cleanupOldBackups(userId);

    return { error: null, success: true };
  } catch (error) {
    console.error('Unexpected error uploading backup to cloud:', error);
    return { error: error as Error, success: false };
  }
}

/**
 * Get list of cloud backups
 */
export async function getCloudBackups(userId: string): Promise<{ backups: CloudBackup[]; error: Error | null }> {
  return listBackups(userId);
}

/**
 * Restore from cloud backup
 */
export async function restoreFromCloudBackup(
  userId: string,
  backupPath: string
): Promise<{ error: Error | null; success: boolean }> {
  try {
    // 1. Download backup from Supabase Storage
    const uri = Paths.document.uri;
    const localBackupPath = `${uri}/cloud-backup-restore.zip`;

    const { error: downloadError } = await downloadBackup(backupPath, localBackupPath);
    if (downloadError) {
      return { error: downloadError, success: false };
    }

    // 2. Restore from local backup file
    const restoreSuccess = await restoreAppData(localBackupPath);
    if (!restoreSuccess) {
      return { error: new Error('Failed to restore from backup'), success: false };
    }

    return { error: null, success: true };
  } catch (error) {
    console.error('Unexpected error restoring from cloud backup:', error);
    return { error: error as Error, success: false };
  }
}

/**
 * Delete cloud backup
 */
export async function deleteCloudBackup(backupPath: string): Promise<{ error: Error | null }> {
  const { deleteBackup } = await import('@/services/supabase/storage');
  return deleteBackup(backupPath);
}

