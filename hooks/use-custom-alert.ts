import { useCallback } from 'react';
import { Platform, Alert as RNAlert } from 'react-native';
import { useAlert, AlertButton } from '@/components/ui/alert';

/**
 * Custom hook that provides an alert function matching React Native's Alert.alert API
 * On iOS: Uses native Alert
 * On Android: Uses custom modal
 */
export const useCustomAlert = () => {
  const { showAlert } = useAlert();

  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[]
    ): void => {
      // On iOS, use native alert (looks good)
      if (Platform.OS === 'ios') {
        RNAlert.alert(title, message, buttons);
        return;
      }

      // On Android, use custom modal
      showAlert({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : undefined,
      });
    },
    [showAlert]
  );

  return { alert };
};

