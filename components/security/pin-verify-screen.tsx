import { useSecurityStore } from '@/store/security-store';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PinNumpad } from './pin-numpad';

interface PinVerifyScreenProps {
  onVerify: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

export function PinVerifyScreen({
  onVerify,
  onCancel,
  title = 'Enter PIN',
  subtitle = 'Enter your PIN to continue',
}: PinVerifyScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { verifyPin } = useSecurityStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const pinDots = Array(4).fill(0);
  const shakeAnimation = useSharedValue(0);
  const errorOpacity = useSharedValue(0);

  const handleDigitPress = async (digit: string) => {
    if (pin.length >= 4) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      const isValid = await verifyPin(newPin);
      if (isValid) {
        onVerify();
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
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onCancel}
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? '#ECEDEE' : '#11181C'}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {title}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content Container - No ScrollView, fits all content */}
          <View style={styles.contentContainer}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDark ? 0.3 : 0.1,
                    shadowRadius: 8,
                    elevation: 4,
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed"
                  size={40}
                  color={isDark ? '#60A5FA' : '#3B82F6'}
                />
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: textColor }]}>
              {title}
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: subtitleColor }]}>
              {subtitle}
            </Text>

            {/* PIN Dots */}
            <Animated.View style={[styles.pinDotsContainer, shakeStyle]}>
              {pinDots.map((_, index) => {
                const isFilled = index < pin.length;
                return (
                  <View
                    key={index}
                    style={[
                      styles.pinDot,
                      {
                        backgroundColor: isFilled
                          ? isDark
                            ? '#60A5FA'
                            : '#3B82F6'
                          : isDark
                          ? '#374151'
                          : '#e5e7eb',
                        borderColor: isFilled
                          ? isDark
                            ? '#60A5FA'
                            : '#3B82F6'
                          : isDark
                          ? '#4b5563'
                          : '#d1d5db',
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>

            {/* Error Message */}
            <Animated.View style={[styles.errorContainer, errorStyle]}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </Animated.View>

            {/* Numpad */}
            <View style={styles.numpadContainer}>
              <PinNumpad
                onDigitPress={handleDigitPress}
                onBackspace={handleBackspace}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorContainer: {
    height: 24,
    marginBottom: 8,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  numpadContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    maxHeight: 300,
  },
});
