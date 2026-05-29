/** Daily cloud backup window: 10:00 PM – 11:59 PM (local time). */
export const CLOUD_BACKUP_WINDOW_START_HOUR = 22;
export const CLOUD_BACKUP_WINDOW_END_HOUR = 24;

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isWithinDailyBackupWindow(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= CLOUD_BACKUP_WINDOW_START_HOUR && hour < CLOUD_BACKUP_WINDOW_END_HOUR;
}

/**
 * Whether an automatic backup should run now.
 * - Same day: only from 10 PM onward (scheduled window or same-night catch-up).
 * - Prior day missed: run on next foreground/background opportunity.
 */
export function shouldRunAutomaticCloudBackup(
  lastBackupDate: string | null,
  now: Date = new Date()
): boolean {
  const today = formatLocalDateKey(now);

  if (lastBackupDate === today) {
    return false;
  }

  if (lastBackupDate !== null && lastBackupDate < today) {
    return true;
  }

  return now.getHours() >= CLOUD_BACKUP_WINDOW_START_HOUR;
}

export function formatLastBackupLabel(lastBackupDate: string | null): string {
  if (!lastBackupDate) {
    return 'Never';
  }

  const [year, month, day] = lastBackupDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
