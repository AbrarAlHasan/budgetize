import { ONBOARDING_STEPS, OnboardingStep } from '@/constants/onboarding-data';
import { useNotificationStore } from '@/store/notification-store';
import { useSettingsStore } from '@/store/settings-store';
import { pickBackupFile, restoreAppData } from '@/utils/backup';
import { logError } from '@/utils/logger';
import { seedDefaultCategoriesAndTags } from '@/utils/seed-defaults';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const DataSetupSlide: React.FC<{
  index: number;
  scrollX: SharedValue<number>;
  onComplete: () => void;
}> = ({ index, scrollX, onComplete }) => {
  // Note: QueryClient is not available during onboarding (rendered before QueryClientProvider)
  // Queries will be fresh when the app loads, so invalidation is not needed
  const { loadSettings } = useSettingsStore();
  const { loadPreferences } = useNotificationStore();
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'new' | 'existing' | null>(null);
  
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [50, 0, -50],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const newButtonScale = useSharedValue(1);
  const existingButtonScale = useSharedValue(1);
  const uploadIconRotation = useSharedValue(0);
  const newButtonPulse = useSharedValue(1);
  const existingButtonPulse = useSharedValue(1);
  const iconHeartbeat = useSharedValue(1);

  // Heartbeat animation for main icon - continuous
  React.useEffect(() => {
    iconHeartbeat.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 400 }),
        withTiming(1, { duration: 400 }),
        withTiming(1.1, { duration: 400 }),
        withTiming(1, { duration: 400 }),
      ),
      -1,
      false
    );
  }, [iconHeartbeat]);

  // Pulse animations for buttons (only when not selected)
  React.useEffect(() => {
    if (selectedOption === null && !isRestoring) {
      newButtonPulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
      existingButtonPulse.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      newButtonPulse.value = withTiming(1, { duration: 300 });
      existingButtonPulse.value = withTiming(1, { duration: 300 });
    }
  }, [selectedOption, isRestoring, newButtonPulse, existingButtonPulse]);

  const newButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: newButtonScale.value * newButtonPulse.value }
    ],
  }));

  const existingButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: existingButtonScale.value * existingButtonPulse.value }
    ],
  }));

  const iconHeartbeatStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconHeartbeat.value }],
  }));

  const uploadIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${uploadIconRotation.value}deg` }],
  }));

  // Animate upload icon when restoring
  React.useEffect(() => {
    if (isRestoring) {
      uploadIconRotation.value = withRepeat(
        withSequence(
          withTiming(360, { duration: 1000 }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    } else {
      uploadIconRotation.value = withTiming(0, { duration: 300 });
    }
  }, [isRestoring, uploadIconRotation]);

  const handleNewData = async () => {
    newButtonScale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
    setSelectedOption('new');
    
    try {
      // Seed default categories and tags
      await seedDefaultCategoriesAndTags();
      // Note: Query invalidation is not needed here since onboarding runs before QueryClientProvider
      // Queries will be fresh when the app loads after onboarding completes
      // Small delay for visual feedback
      setTimeout(() => {
        onComplete();
      }, 300);
    } catch (error) {
      logError('Error seeding default data:', error);
      // Still complete onboarding even if seeding fails
      Alert.alert(
        'Setup Complete',
        'Your account has been created. Some default categories and tags could not be created, but you can add them manually later.',
        [{ text: 'OK', onPress: onComplete }]
      );
    }
  };

  const handleExistingData = async () => {
    existingButtonScale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
    setSelectedOption('existing');
    
    try {
      setIsRestoring(true);
      const backupPath = await pickBackupFile();
      
      if (!backupPath) {
        setIsRestoring(false);
        setSelectedOption(null);
        Alert.alert(
          "No File Selected",
          "Please select a backup file to restore your data."
        );
        return;
      }

      const success = await restoreAppData(backupPath);
      
      if (success) {
        await loadSettings();
        await loadPreferences();
        Alert.alert(
          "Restore Complete",
          "Your data has been successfully restored!",
          [{ text: "OK", onPress: onComplete }]
        );
      } else {
        setIsRestoring(false);
        setSelectedOption(null);
        Alert.alert(
          "Restore Failed",
          "Could not restore the backup. Please make sure you selected a valid backup file and try again."
        );
      }
    } catch (error) {
      logError("Restore failed:", error);
      setIsRestoring(false);
      setSelectedOption(null);
      Alert.alert(
        "Restore Failed",
        "An unexpected error occurred while restoring the backup."
      );
    }
  };

  const step = ONBOARDING_STEPS[index];

  return (
    <View style={[styles.slide, { backgroundColor: step.backgroundColor }]}>
      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        <Animated.View
          style={[
            styles.decorativeCircle,
            { backgroundColor: step.color + '20', top: -100, right: -50 },
            containerAnimatedStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            { backgroundColor: step.color + '15', bottom: -80, left: -60 },
            { transform: [{ scale: 1.2 }] },
          ]}
        />
      </View>

      {/* Main Icon */}
      <Animated.View style={[styles.iconContainer, styles.dataSetupIconContainer, containerAnimatedStyle]}>
        <View
          style={[
            styles.iconCircle,
            styles.dataSetupIconCircle,
            {
              backgroundColor: step.color + '30',
              shadowColor: step.color,
            },
          ]}
        >
          <Animated.View style={[styles.iconInnerCircle, styles.dataSetupIconInnerCircle, { backgroundColor: step.color }, iconHeartbeatStyle]}>
            <Ionicons name={step.icon as any} size={60} color="#FFFFFF" />
          </Animated.View>
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, styles.dataSetupContent, containerAnimatedStyle]}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>

        {/* Option Buttons */}
        <View style={styles.optionsContainer}>
          {/* New Data Option */}
          <Animated.View style={newButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedOption === 'new' && [
                  styles.optionButtonSelected,
                  { backgroundColor: step.color + '10', borderColor: step.color },
                ],
                { borderColor: step.color },
              ]}
              onPress={handleNewData}
              disabled={isRestoring || selectedOption !== null}
              activeOpacity={0.8}
            >
              <View style={[
                styles.optionIconContainer, 
                { backgroundColor: selectedOption === 'new' ? step.color : step.color + '15' }
              ]}>
                <Ionicons
                  name="add-circle"
                  size={40}
                  color={selectedOption === 'new' ? '#FFFFFF' : step.color}
                />
              </View>
              <Text
                style={[
                  styles.optionTitle,
                  selectedOption === 'new' && styles.optionTitleSelected,
                ]}
              >
                Start Fresh
              </Text>
              <Text style={styles.optionDescription}>
                Create a new account and begin tracking from scratch
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Existing Data Option */}
          <Animated.View style={existingButtonAnimatedStyle}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedOption === 'existing' && [
                  styles.optionButtonSelected,
                  { backgroundColor: step.color + '10', borderColor: step.color },
                ],
                { borderColor: step.color },
              ]}
              onPress={handleExistingData}
              disabled={isRestoring || selectedOption !== null}
              activeOpacity={0.8}
            >
              <View style={[
                styles.optionIconContainer, 
                { backgroundColor: selectedOption === 'existing' ? step.color : step.color + '15' }
              ]}>
                {isRestoring ? (
                  <Animated.View style={uploadIconAnimatedStyle}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </Animated.View>
                ) : (
                  <Ionicons
                    name="cloud-upload"
                    size={40}
                    color={selectedOption === 'existing' ? '#FFFFFF' : step.color}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.optionTitle,
                  selectedOption === 'existing' && styles.optionTitleSelected,
                ]}
              >
                {isRestoring ? 'Restoring...' : 'Use Existing Data'}
              </Text>
              <Text style={styles.optionDescription}>
                {isRestoring
                  ? 'Please wait while we restore your backup'
                  : 'Upload a backup file to restore your previous data'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
};

const OnboardingSlide: React.FC<{
  step: OnboardingStep;
  index: number;
  scrollX: SharedValue<number>;
}> = ({ step, index, scrollX }) => {
  const inputRange = [
    (index - 1) * SCREEN_WIDTH,
    index * SCREEN_WIDTH,
    (index + 1) * SCREEN_WIDTH,
  ];

  const iconAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [100, 0, -100],
      Extrapolate.CLAMP
    );

    const rotate = interpolate(
      scrollX.value,
      inputRange,
      [-45, 0, 45],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { scale },
        { translateY },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [50, 0, -50],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const descriptionAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollX.value,
      inputRange,
      [30, 0, -30],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View style={[styles.slide, { backgroundColor: step.backgroundColor }]}>
      {/* Top Decorative Circles */}
      <View style={styles.decorativeContainer}>
        <Animated.View
          style={[
            styles.decorativeCircle,
            { backgroundColor: step.color + '20', top: -100, right: -50 },
            iconAnimatedStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.decorativeCircle,
            { backgroundColor: step.color + '15', bottom: -80, left: -60 },
            {
              transform: [{ scale: 1.2 }],
            },
          ]}
        />
      </View>

      {/* Main Icon */}
      <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: step.color + '30',
              shadowColor: step.color,
            },
          ]}
        >
          <View style={[styles.iconInnerCircle, { backgroundColor: step.color }]}>
            <Ionicons name={step.icon as any} size={80} color="#FFFFFF" />
          </View>
        </View>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <Animated.Text style={[styles.title, titleAnimatedStyle]}>
          {step.title}
        </Animated.Text>

        <Animated.Text style={[styles.description, descriptionAnimatedStyle]}>
          {step.description}
        </Animated.Text>

        {/* Features */}
        {step.features && (
          <View style={styles.featuresContainer}>
            {step.features.map((feature, idx) => (
              <Animated.View
                key={idx}
                style={[
                  styles.featureItem,
                  descriptionAnimatedStyle,
                  {
                    backgroundColor: '#FFFFFF',
                  },
                ]}
              >
                <View
                  style={[styles.featureIconContainer, { backgroundColor: step.color + '15' }]}
                >
                  <Ionicons name={feature.icon as any} size={20} color={step.color} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </Animated.View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const scrollX = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      
      const index = Math.round(event.contentOffset.x / SCREEN_WIDTH);
      runOnJS(setCurrentIndex)(index);
    },
  });

  const handleNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    // Skip to the last screen (data setup) instead of completing onboarding
    const lastScreenIndex = ONBOARDING_STEPS.length - 1;
    scrollViewRef.current?.scrollTo({
      x: lastScreenIndex * SCREEN_WIDTH,
      animated: true,
    });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const isLastSlide = currentIndex === ONBOARDING_STEPS.length - 1;
    const backgroundColor = withSpring(
      isLastSlide ? '#10B981' : '#3B82F6',
      { damping: 15 }
    );

    return {
      backgroundColor,
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Skip Button - Hide on data setup slide */}
      {currentIndex < ONBOARDING_STEPS.length - 1 && currentIndex !== ONBOARDING_STEPS.length - 2 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Scrollable Content */}
      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {ONBOARDING_STEPS.map((step, index) => {
          // Render custom data setup slide for the last step
          if (step.id === 4) {
            return (
              <DataSetupSlide
                key={step.id}
                index={index}
                scrollX={scrollX}
                onComplete={onComplete}
              />
            );
          }
          // Render regular slides for other steps
          return (
          <OnboardingSlide
            key={step.id}
            step={step}
            index={index}
            scrollX={scrollX}
          />
          );
        })}
      </Animated.ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, index) => {
            const dotAnimatedStyle = useAnimatedStyle(() => {
              const isActive = Math.round(scrollX.value / SCREEN_WIDTH) === index;
              const width = withSpring(isActive ? 32 : 8, { damping: 15 });
              const opacity = withSpring(isActive ? 1 : 0.3, { damping: 15 });

              return {
                width,
                opacity,
              };
            });

            return (
              <Animated.View
                key={index}
                style={[styles.dot, dotAnimatedStyle]}
              />
            );
          })}
        </View>

        {/* Action Button - Hide on data setup slide */}
        {currentIndex !== ONBOARDING_STEPS.length - 1 && (
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.8}
          >
              <Text style={styles.buttonText}>Next</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
        )}

        {/* Trust Indicators - Show on second to last slide */}
        {currentIndex === ONBOARDING_STEPS.length - 2 && (
          <View style={styles.trustIndicators}>
            <Text style={styles.trustText}>
              🔒 Bank-level encryption • 📊 No ads, ever • 💯 100% free
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  iconContainer: {
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 20,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconInnerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  dataSetupContent: {
    paddingBottom: 200, // Extra padding for bottom section
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  dataSetupIconContainer: {
    marginTop: Platform.OS === 'ios' ? 100 : 80, // Extra margin to avoid notch
    marginBottom: 20,
  },
  dataSetupIconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  dataSetupIconInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: 'transparent',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  trustIndicators: {
    marginTop: 16,
    alignItems: 'center',
  },
  trustText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
    marginTop: 16,
    paddingBottom: 20,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  optionButtonSelected: {
    borderStyle: 'solid',
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
  },
  optionIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionTitleSelected: {
    color: '#111827',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

