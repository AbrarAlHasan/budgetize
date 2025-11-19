import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ONBOARDING_STEPS, OnboardingStep } from '@/constants/onboarding-data';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingSlide: React.FC<{
  step: OnboardingStep;
  index: number;
  scrollX: Animated.SharedValue<number>;
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
    onComplete();
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
      
      {/* Skip Button */}
      {currentIndex < ONBOARDING_STEPS.length - 1 && (
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
        {ONBOARDING_STEPS.map((step, index) => (
          <OnboardingSlide
            key={step.id}
            step={step}
            index={index}
            scrollX={scrollX}
          />
        ))}
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

        {/* Action Button */}
        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {currentIndex === ONBOARDING_STEPS.length - 1
                ? "Get Started"
                : "Next"}
            </Text>
            <Ionicons
              name={
                currentIndex === ONBOARDING_STEPS.length - 1
                  ? "checkmark-circle"
                  : "arrow-forward"
              }
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Trust Indicators (Last Slide) */}
        {currentIndex === ONBOARDING_STEPS.length - 1 && (
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
    marginBottom: 40,
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
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
});

