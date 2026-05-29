import { mmkv } from '@/storage/mmkv';

const AUTO_CLOUD_BACKUP_ENABLED_KEY = 'auto_cloud_backup_enabled';
const LAST_AUTO_CLOUD_BACKUP_DATE_KEY = 'last_auto_cloud_backup_date';

export const cloudBackupScheduleStorage = {
  isAutoBackupEnabled(): boolean {
    const value = mmkv.getString(AUTO_CLOUD_BACKUP_ENABLED_KEY);
    // Opt-in: off until the user enables automatic backup in Settings
    return value === 'true';
  },

  setAutoBackupEnabled(enabled: boolean): void {
    mmkv.set(AUTO_CLOUD_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
  },

  getLastBackupDate(): string | null {
    return mmkv.getString(LAST_AUTO_CLOUD_BACKUP_DATE_KEY) ?? null;
  },

  setLastBackupDate(date: string): void {
    mmkv.set(LAST_AUTO_CLOUD_BACKUP_DATE_KEY, date);
  },

  clearLastBackupDate(): void {
    mmkv.remove(LAST_AUTO_CLOUD_BACKUP_DATE_KEY);
  },
};
