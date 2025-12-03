import { getBackgroundColor } from '@/utils/colors';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Alert as RNAlert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = React.createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = React.useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: React.ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alertState, setAlertState] = React.useState<AlertOptions | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const showAlert = useCallback((options: AlertOptions) => {
    // On iOS, use native alert
    if (Platform.OS === 'ios') {
      RNAlert.alert(options.title, options.message, options.buttons);
      return;
    }

    // On Android, show custom modal
    setAlertState(options);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(null);
  }, []);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      hideAlert();
      // Small delay to ensure modal is dismissed before calling onPress
      setTimeout(() => {
        button.onPress?.();
      }, 100);
    },
    [hideAlert]
  );

  const backgroundColor = useMemo(
    () => getBackgroundColor(isDark),
    [isDark]
  );

  const textColor = useMemo(
    () => (isDark ? '#ECEDEE' : '#11181C'),
    [isDark]
  );

  const secondaryTextColor = useMemo(
    () => (isDark ? '#9BA1A6' : '#687076'),
    [isDark]
  );

  // Process buttons: separate cancel buttons from action buttons
  // Cancel buttons go on the left, action buttons on the right
  const { cancelButtons, actionButtons } = useMemo(() => {
    if (!alertState?.buttons || alertState.buttons.length === 0) {
      return {
        cancelButtons: [],
        actionButtons: [{ text: 'OK', style: 'default' as const, onPress: hideAlert }],
      };
    }

    const cancelButtons: AlertButton[] = [];
    const actionButtons: AlertButton[] = [];

    alertState.buttons.forEach((button) => {
      if (button.style === 'cancel') {
        cancelButtons.push(button);
      } else {
        actionButtons.push(button);
      }
    });

    return { cancelButtons, actionButtons };
  }, [alertState?.buttons, hideAlert]);

  // Set global instance for non-component usage
  React.useEffect(() => {
    setGlobalAlertInstance({ showAlert });
    return () => {
      globalAlertInstance = null;
    };
  }, [showAlert]);

  // Handle back button press - only allow if there's a cancel button
  const handleBackButton = useCallback(() => {
    if (!alertState?.buttons) return;
    const cancelButton = alertState.buttons.find((b) => b.style === 'cancel');
    if (cancelButton) {
      handleButtonPress(cancelButton);
    }
  }, [alertState?.buttons, handleButtonPress]);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {/* Android Custom Modal */}
      {Platform.OS === 'android' && alertState && (
        <Modal
          visible={!!alertState}
          transparent
          animationType="fade"
          onRequestClose={handleBackButton}
          statusBarTranslucent
        >
          <Pressable
            style={styles.overlay}
          >
            <Pressable
              style={[
                styles.modalContainer,
                { backgroundColor },
                {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                  elevation: 8,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Title */}
              <Text
                style={[styles.title, { color: textColor }]}
                className="text-lg font-semibold mb-2"
              >
                {alertState.title}
              </Text>

              {/* Message */}
              {alertState.message && (
                <Text
                  style={[styles.message, { color: secondaryTextColor }]}
                  className="text-base mb-6"
                >
                  {alertState.message}
                </Text>
              )}

              {/* Buttons */}
              <View
                style={[
                  styles.buttonContainer,
                  cancelButtons.length === 1 &&
                    actionButtons.length === 1 &&
                    styles.buttonContainerFullWidth,
                ]}
              >
                {/* Cancel buttons on the left */}
                {cancelButtons.length > 0 && (
                  <View
                    style={[
                      styles.cancelButtonContainer,
                      cancelButtons.length === 1 &&
                        actionButtons.length === 1 &&
                        styles.buttonFullWidth,
                    ]}
                  >
                    {cancelButtons.map((button, index) => (
                      <TouchableOpacity
                        key={`cancel-${index}`}
                        onPress={() => handleButtonPress(button)}
                        style={[
                          styles.button,
                          styles.cancelButton,
                          cancelButtons.length === 1 &&
                            actionButtons.length === 1 &&
                            styles.buttonFullWidth,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.1)'
                              : 'rgba(0, 0, 0, 0.05)',
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={{ color: textColor }}
                          className="font-medium"
                        >
                          {button.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Action buttons on the right */}
                {actionButtons.length > 0 && (
                  <View
                    style={[
                      styles.actionButtonContainer,
                      cancelButtons.length === 0 && styles.actionButtonContainerSingle,
                      cancelButtons.length === 1 &&
                        actionButtons.length === 1 &&
                        styles.buttonFullWidth,
                    ]}
                  >
                    {actionButtons.map((button, index) => {
                      const isDestructive = button.style === 'destructive';
                      const isLast = index === actionButtons.length - 1;
                      const isTwoButtonLayout =
                        cancelButtons.length === 1 && actionButtons.length === 1;

                      // Destructive buttons get red styling
                      if (isDestructive) {
                        return (
                          <TouchableOpacity
                            key={`action-${index}`}
                            onPress={() => handleButtonPress(button)}
                            style={[
                              styles.button,
                              styles.destructiveButton,
                              !isLast && !isTwoButtonLayout && styles.buttonMargin,
                              isTwoButtonLayout && styles.buttonFullWidth,
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={styles.destructiveButtonText}
                              className="font-semibold"
                            >
                              {button.text}
                            </Text>
                          </TouchableOpacity>
                        );
                      }

                      // Default buttons get blue styling
                      return (
                        <TouchableOpacity
                          key={`action-${index}`}
                          onPress={() => handleButtonPress(button)}
                          style={[
                            styles.button,
                            styles.defaultButton,
                            !isLast && !isTwoButtonLayout && styles.buttonMargin,
                            isTwoButtonLayout && styles.buttonFullWidth,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={styles.defaultButtonText}
                            className="font-semibold"
                          >
                            {button.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  buttonContainerFullWidth: {
    gap: 8,
  },
  cancelButtonContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    minWidth: 0, // Prevent overflow
  },
  actionButtonContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    minWidth: 0, // Prevent overflow
  },
  actionButtonContainerSingle: {
    marginLeft: 0,
    flex: 0,
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFullWidth: {
    flex: 1,
    minWidth: 0, // Prevent overflow
  },
  buttonMargin: {
    marginRight: 0,
  },
  defaultButton: {
    backgroundColor: '#3B82F6',
  },
  defaultButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  cancelButton: {
    // Background set dynamically in component
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

// Global alert instance for non-component usage
let globalAlertInstance: AlertContextType | null = null;

export const setGlobalAlertInstance = (instance: AlertContextType) => {
  globalAlertInstance = instance;
};

// Export a convenience function that matches Alert.alert API
// This can be used in non-component code (utils, services, etc.)
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ): void => {
    // On iOS, always use native alert
    if (Platform.OS === 'ios') {
      RNAlert.alert(title, message, buttons);
      return;
    }

    // On Android, use custom modal if available, otherwise fallback to native
    if (globalAlertInstance) {
      globalAlertInstance.showAlert({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : undefined,
      });
    } else {
      // Fallback to native alert if provider not initialized
      RNAlert.alert(title, message, buttons);
    }
  },
};

