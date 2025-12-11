import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  text: string;
  delay: number;
  contentOpacity: SharedValue<number>;
  contentY: SharedValue<number>;
}

function FeatureItem({ icon, iconColor, text, delay, contentOpacity, contentY }: FeatureItemProps) {
  const itemOpacity = useSharedValue(0);
  const itemY = useSharedValue(20);

  useEffect(() => {
    itemOpacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      })
    );

    itemY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
      })
    );
  }, [delay]);

  const itemAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: itemOpacity.value,
      transform: [{ translateY: itemY.value }],
    };
  });

  const bgColorMap: Record<string, string> = {
    '#10B981': 'bg-green-500/30',
    '#8B5CF6': 'bg-purple-500/30',
    '#3B82F6': 'bg-blue-500/30',
  };

  return (
    <Animated.View
      style={itemAnimatedStyle}
      className={`flex-row items-center mb-3 bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20`}
    >
      <View className={`${bgColorMap[iconColor] || 'bg-gray-500/30'} rounded-full p-2 mr-3`}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-white text-sm flex-1 font-medium">
        {text}
      </Text>
    </Animated.View>
  );
}

interface UpdateScreenProps {
  onUpdate: () => void;
  onCancel: () => void;
  isUpdating?: boolean;
}

export function UpdateScreen({ onUpdate, onCancel, isUpdating = false }: UpdateScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation values
  const iconScale = useSharedValue(0.8);
  const iconRotation = useSharedValue(0);
  const iconY = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(20);
  const shimmerProgress = useSharedValue(0);
  
  const handleCancel = () => {
    console.log('UpdateScreen: Cancel button pressed');
    onCancel();
  };

  useEffect(() => {
    // Icon pulsing and floating animation
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    iconY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    iconRotation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-5, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Content fade-in animation
    contentOpacity.value = withDelay(
      300,
      withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.ease),
      })
    );

    contentY.value = withDelay(
      300,
      withSpring(0, {
        damping: 15,
        stiffness: 100,
      })
    );

    // Shimmer effect
    shimmerProgress.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  // Icon animation style
  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: iconScale.value },
        { translateY: iconY.value },
        { rotate: `${iconRotation.value}deg` },
      ],
    };
  });

  // Content animation style
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ translateY: contentY.value }],
    };
  });

  // Shimmer animation style
  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerProgress.value,
      [0, 1],
      [-400, 400]
    );
    const opacity = interpolate(
      shimmerProgress.value,
      [0, 0.5, 1],
      [0, 0.3, 0]
    );
    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  // Single gradient color for background
  const backgroundColor = isDark ? '#1a1a2e' : '#667eea';

  return (
    <View style={{ flex: 1 }}>
      {/* Single Color Background */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: backgroundColor,
        }}
      />

      {/* Shimmer overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '50%',
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          },
          shimmerAnimatedStyle,
        ]}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <Animated.View
          style={[contentAnimatedStyle, { flex: 1 }]}
          className="flex-1 items-center justify-center px-6"
        >
          {/* Icon/Logo with colorful gradient background */}
          <Animated.View className="mb-6" style={iconAnimatedStyle}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              <Ionicons name="cloud-download-outline" size={48} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text className="text-3xl font-bold text-white text-center mb-3" style={{ textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
            Update Available
          </Text>

          {/* Description */}
          <Text className="text-base text-white/90 text-center mb-8 leading-6 px-4" style={{ textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
            A new version is ready with exciting features and improvements.
          </Text>

          {/* Features List with colorful icons */}
          <View className="w-full mb-8 px-2">
            <FeatureItem
              icon="checkmark-circle"
              iconColor="#10B981"
              text="Enhanced performance"
              delay={600}
              contentOpacity={contentOpacity}
              contentY={contentY}
            />
            <FeatureItem
              icon="sparkles"
              iconColor="#8B5CF6"
              text="New features and improvements"
              delay={800}
              contentOpacity={contentOpacity}
              contentY={contentY}
            />
            <FeatureItem
              icon="shield-checkmark"
              iconColor="#3B82F6"
              text="Bug fixes and stability updates"
              delay={1000}
              contentOpacity={contentOpacity}
              contentY={contentY}
            />
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-3 px-2">
            <TouchableOpacity
              onPress={onUpdate}
              disabled={isUpdating}
              className="rounded-2xl py-4 px-8"
              style={{
                backgroundColor: '#8B5CF6',
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 12,
              }}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center">
                {isUpdating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text className="text-white text-lg font-bold">
                      Updating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                    <Text className="text-white text-lg font-bold ml-2">
                      Update Now
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              disabled={isUpdating}
              className="bg-white/20 backdrop-blur rounded-2xl py-4 px-8 border border-white/30"
              activeOpacity={0.7}
            >
              <Text className="text-white text-lg font-semibold text-center">
                Later
              </Text>
            </TouchableOpacity>
          </View>

          {/* Version Info (for dev mode) */}
          {__DEV__ && (
            <Animated.View
              style={[
                contentAnimatedStyle,
                { opacity: contentOpacity.value },
              ]}
              className="mt-6 bg-white/10 backdrop-blur rounded-xl px-4 py-2 border border-white/20"
            >
              <Text className="text-white/80 text-xs text-center font-medium">
                Development Mode - Update screen visible for testing
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

