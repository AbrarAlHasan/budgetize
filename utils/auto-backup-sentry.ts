import * as Sentry from '@sentry/react-native';
import { logError } from '@/utils/logger';

export const AUTO_BACKUP_SENTRY_TAG = 'auto-backup';

export interface AutoBackupSentryContext {
  phase: string;
  skippedReason?: string;
  userId?: string;
  appState?: string;
  backupStep?: string;
  isCatchUp?: boolean;
  [key: string]: string | number | boolean | undefined | null;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message);
    const normalized = new Error(message);
    if ('stack' in error && typeof (error as { stack?: unknown }).stack === 'string') {
      normalized.stack = (error as { stack: string }).stack;
    }
    return normalized;
  }
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error(String(error));
  }
}

/**
 * Reports an auto-backup error to console and Sentry with the `auto-backup` tag.
 */
export function reportAutoBackupError(
  error: unknown,
  context: AutoBackupSentryContext
): void {
  const err = normalizeError(error);
  logError(`[auto-backup:${context.phase}]`, err, context);

  try {
    Sentry.withScope((scope) => {
      scope.setTag(AUTO_BACKUP_SENTRY_TAG, 'true');
      scope.setTag('phase', context.phase);
      if (context.skippedReason) {
        scope.setTag('skipped_reason', context.skippedReason);
      }
      if (context.backupStep) {
        scope.setTag('backup_step', String(context.backupStep));
      }
      if (context.appState) {
        scope.setTag('app_state', String(context.appState));
      }

      Object.entries(context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          scope.setExtra(key, value);
        }
      });

      if (err.stack) {
        scope.setExtra('stack', err.stack);
      }

      scope.setFingerprint([
        'auto-backup',
        context.phase,
        String(context.backupStep ?? 'unknown_step'),
        err.message,
      ]);
      Sentry.captureException(err);
    });
  } catch {
    // Sentry unavailable — console log above is sufficient
  }
}

/**
 * Reports a non-throwing auto-backup failure (e.g. upload returned false).
 */
export function reportAutoBackupFailure(
  message: string,
  context: AutoBackupSentryContext,
  cause?: unknown
): void {
  const err = cause ? normalizeError(cause) : new Error(message);
  if (cause && err.message !== message) {
    err.message = `${message}: ${err.message}`;
  } else if (!cause) {
    err.message = message;
  }

  reportAutoBackupError(err, context);
}
