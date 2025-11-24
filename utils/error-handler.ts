import { Alert } from 'react-native';
import { logError } from '@/utils/logger';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export function handleError(error: unknown, defaultMessage = 'An error occurred'): void {
  let message = defaultMessage;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    message = String(error.message);
  }

  logError('Error:', error);
  Alert.alert('Error', message);
}

export function handleSuccess(message: string, onDismiss?: () => void): void {
  Alert.alert('Success', message, [
    {
      text: 'OK',
      onPress: onDismiss,
    },
  ]);
}

export function handleConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void {
  Alert.alert(title, message, [
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: 'Confirm',
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
}

