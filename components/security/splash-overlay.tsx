import { useColorScheme } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Image, StyleSheet, View } from 'react-native';
import Animated, {
    cancelAnimation,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

export function SplashOverlay() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isVisible, setIsVisible] = useState(false);
  const opacity = useSharedValue(0);
  const isMountedRef = useRef(true);

  // Safe state update function that checks if mounted
  const safeSetVisible = (value: boolean) => {
    if (isMountedRef.current) {
      setIsVisible(value);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let subscription: ReturnType<typeof AppState.addEventListener> | null = null;
    
    try {
      subscription = AppState.addEventListener(
        'change',
        (nextAppState: AppStateStatus) => {
          try {
            if (!isMountedRef.current) return;

            if (nextAppState === 'inactive' || nextAppState === 'background') {
              // Show splash overlay when app becomes inactive
              if (isMountedRef.current) {
                setIsVisible(true);
                opacity.value = withTiming(1, { duration: 200 });
              }
            } else if (nextAppState === 'active') {
              // Hide splash overlay when app becomes active
              // Use runOnJS to safely call setState from worklet callback
              // safeSetVisible will check if component is still mounted
              opacity.value = withTiming(
                0,
                { duration: 200 },
                (finished) => {
                  if (finished) {
                    runOnJS(safeSetVisible)(false);
                  }
                }
              );
            }
          } catch (error) {
            console.error('Error in splash overlay app state handler:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up splash overlay listener:', error);
    }

    return () => {
      try {
        // Cancel any ongoing animations
        cancelAnimation(opacity);
        opacity.value = 0;
        isMountedRef.current = false;
        
        if (subscription) {
          subscription.remove();
        }
      } catch (error) {
        console.error('Error removing splash overlay listener:', error);
      }
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: isVisible ? 'auto' : 'none',
  }));

  if (!isVisible && opacity.value === 0) {
    return null;
  }

  const backgroundColor = isDark ? '#000000' : '#ffffff';
  
  // Safely load splash icons
  let splashIcon;
  try {
    splashIcon = isDark
      ? require('@/assets/app-icons/splash-icon-dark.png')
      : require('@/assets/app-icons/splash-icon-light.png');
  } catch (error) {
    console.error('Error loading splash icon:', error);
    // Fallback to light icon if dark fails
    try {
      splashIcon = require('@/assets/app-icons/splash-icon-light.png');
    } catch {
      // If both fail, return null to prevent crash
      return null;
    }
  }

  if (!splashIcon) {
    return null;
  }

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor,
          zIndex: 9999,
        },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        <Image
          source={splashIcon}
          style={styles.icon}
          resizeMode="contain"
          onError={(error) => {
            console.error('Error displaying splash icon:', error);
          }}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 200,
    height: 200,
  },
});
