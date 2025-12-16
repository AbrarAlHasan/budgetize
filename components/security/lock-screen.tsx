import { useSecurityStore } from '@/store/security-store';
import { logError } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinNumpad } from './pin-numpad';

interface LockScreenProps {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isBiometricEnabled, verifyPin, setAuthenticated } = useSecurityStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricType, setBiometricType] = useState<
    LocalAuthentication.AuthenticationType | null
  >(null);

  const pinDots = Array(4).fill(0);
  const shakeAnimation = useSharedValue(0);
  const errorOpacity = useSharedValue(0);

  useEffect(() => {
    // Try biometric authentication on mount
    if (isBiometricEnabled) {
      authenticateWithBiometric();
    }
  }, [isBiometricEnabled]);

  const authenticateWithBiometric = async () => {
    try {
      setIsAuthenticating(true);
      setError('');

      // Check available authentication types
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setIsAuthenticating(false);
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setIsAuthenticating(false);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricType(types[0] || null);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock Budgetize',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: false,
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        setAuthenticated(true);
        onUnlock();
      } else {
        // User cancelled or failed - show PIN entry
        setError('');
      }
    } catch (error) {
      logError('Biometric authentication error:', error);
      setError('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDigitPress = async (digit: string) => {
    if (pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      const isValid = await verifyPin(newPin);
      if (isValid) {
        setAuthenticated(true);
        onUnlock();
      } else {
        // Shake animation and error
        shakeAnimation.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withSpring(0, { damping: 15 })
        );
        errorOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 2000 })
        );
        setError('Incorrect PIN');
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnimation.value }],
  }));

  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const bgColor = isDark ? '#000000' : '#ffffff';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const subtitleColor = isDark ? '#9BA1A6' : '#687076';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          {/* App Icon/Logo */}
          <Animated.View style={shakeStyle} className="mb-8">
            <View
              className="w-24 h-24 rounded-3xl items-center justify-center"
              style={{
                backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons
                name="lock-closed"
                size={48}
                color={isDark ? '#60A5FA' : '#3B82F6'}
              />
            </View>
          </Animated.View>

          {/* Title */}
          <Text
            className="text-2xl font-bold mb-2"
            style={{ color: textColor }}
          >
            Unlock Budgetize
          </Text>

          {/* Subtitle */}
          <Text
            className="text-base mb-8 text-center"
            style={{ color: subtitleColor }}
          >
            {isBiometricEnabled && !isAuthenticating
              ? 'Use biometric or enter your PIN'
              : 'Enter your PIN to continue'}
          </Text>

          {/* PIN Dots */}
          <Animated.View
            style={shakeStyle}
            className="flex-row gap-4 mb-6"
          >
            {pinDots.map((_, index) => {
              const isFilled = index < pin.length;
              return (
                <View
                  key={index}
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: isFilled
                      ? isDark
                        ? '#60A5FA'
                        : '#3B82F6'
                      : isDark
                      ? '#374151'
                      : '#e5e7eb',
                    borderWidth: 1,
                    borderColor: isFilled
                      ? isDark
                        ? '#60A5FA'
                        : '#3B82F6'
                      : isDark
                      ? '#4b5563'
                      : '#d1d5db',
                  }}
                />
              );
            })}
          </Animated.View>

          {/* Error Message */}
          <Animated.View style={errorStyle} className="h-6 mb-4">
            {error ? (
              <Text className="text-sm text-red-500 font-medium">{error}</Text>
            ) : null}
          </Animated.View>

          {/* Biometric Button */}
          {isBiometricEnabled && !isAuthenticating && (
            <TouchableOpacity
              onPress={authenticateWithBiometric}
              className="mb-6 px-6 py-3 rounded-xl"
              style={{
                backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={
                    biometricType ===
                    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
                      ? 'face-recognition'
                      : 'finger-print'
                  }
                  size={20}
                  color={isDark ? '#60A5FA' : '#3B82F6'}
                />
                <Text
                  className="text-base font-medium"
                  style={{ color: isDark ? '#60A5FA' : '#3B82F6' }}
                >
                  {biometricType ===
                  LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
                    ? 'Use Face ID'
                    : 'Use Fingerprint'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Loading Indicator */}
          {isAuthenticating && (
            <View className="mb-6">
              <ActivityIndicator
                size="small"
                color={isDark ? '#60A5FA' : '#3B82F6'}
              />
            </View>
          )}

          {/* Numpad */}
          <PinNumpad
            onDigitPress={handleDigitPress}
            onBackspace={handleBackspace}
            disabled={isAuthenticating}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
