let isAutoCloudBackupRunning = false;

export function tryAcquireAutoCloudBackupLock(): boolean {
  if (isAutoCloudBackupRunning) {
    return false;
  }

  isAutoCloudBackupRunning = true;
  return true;
}

export function releaseAutoCloudBackupLock(): void {
  isAutoCloudBackupRunning = false;
}

export function isAutoCloudBackupLocked(): boolean {
  return isAutoCloudBackupRunning;
}
