import { AI_GRADIENT } from '@/constants/ai-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function useAiGlowAnimations(enabled: boolean) {
  const pulse = useSharedValue(0);
  const rotation = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;

    pulse.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    rotation.value = withRepeat(
      withTiming(360, { duration: 5000, easing: Easing.linear }),
      -1,
      false
    );
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [enabled, pulse, rotation, shimmer]);

  return { pulse, rotation, shimmer };
}

interface AiGlowBorderProps {
  children: ReactNode;
  borderRadius?: number;
  borderWidth?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  innerClassName?: string;
}

export function AiGlowBorder({
  children,
  borderRadius = 16,
  borderWidth = 1.5,
  animated = true,
  style,
  innerClassName,
}: AiGlowBorderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { pulse, rotation } = useAiGlowAnimations(animated);
  const innerRadius = Math.max(borderRadius - borderWidth, 0);

  const innerBg =
    innerClassName ?? (isDark ? 'bg-gray-900' : 'bg-white');

  const ringPulseStyle = useAnimatedStyle(() => ({
    opacity: animated ? interpolate(pulse.value, [0, 1], [0.9, 1]) : 1,
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!animated) {
    return (
      <View style={[{ borderRadius, overflow: 'hidden' }, style]}>
        <LinearGradient
          colors={[...AI_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius, padding: borderWidth }}
        >
          <View
            className={innerBg}
            style={{ borderRadius: innerRadius, overflow: 'hidden' }}
          >
            {children}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <Animated.View
      style={[{ borderRadius, overflow: 'hidden' }, style, ringPulseStyle]}
    >
      <Animated.View style={[styles.rotatingGradient, rotateStyle]}>
        <LinearGradient
          colors={[...AI_GRADIENT, '#4285F4', '#7C4DFF', '#E040FB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.rotatingGradientFill}
        />
      </Animated.View>

      <View
        className={innerBg}
        style={{
          margin: borderWidth,
          borderRadius: innerRadius,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

interface AiSparklesIconProps {
  size?: number;
  iconSize?: number;
  animated?: boolean;
  borderWidth?: number;
  /** Must match the surface behind the icon so the ring reads as hollow */
  innerBackgroundColor?: string;
}

export function AiSparklesIcon({
  size = 28,
  iconSize,
  animated = true,
  borderWidth,
  innerBackgroundColor,
}: AiSparklesIconProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const resolvedIconSize = iconSize ?? Math.round(size * 0.52);
  const resolvedBorderWidth = borderWidth ?? Math.max(1.5, size * 0.045);
  const innerDiameter = size - resolvedBorderWidth * 2;
  const innerRadius = Math.max(innerDiameter / 2, 0);
  const innerBg =
    innerBackgroundColor ?? (isDark ? '#000000' : '#FFFFFF');

  const { pulse, rotation } = useAiGlowAnimations(animated);

  const ringPulseStyle = useAnimatedStyle(() => ({
    opacity: animated ? interpolate(pulse.value, [0, 1], [0.88, 1]) : 1,
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
          },
          ringPulseStyle,
        ]}
      >
        {animated ? (
          <Animated.View style={[styles.rotatingGradient, rotateStyle]}>
            <LinearGradient
              colors={[...AI_GRADIENT, '#4285F4', '#7C4DFF', '#E040FB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rotatingGradientFill}
            />
          </Animated.View>
        ) : (
          <LinearGradient
            colors={[...AI_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View
          style={{
            position: 'absolute',
            top: resolvedBorderWidth,
            left: resolvedBorderWidth,
            width: innerDiameter,
            height: innerDiameter,
            borderRadius: innerRadius,
            backgroundColor: innerBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="sparkles" size={resolvedIconSize} color="#7C4DFF" />
        </View>
      </Animated.View>
    </View>
  );
}

interface AiSectionHeaderProps {
  title: string;
  className?: string;
}

export function AiSectionHeader({ title, className }: AiSectionHeaderProps) {
  return (
    <View className={`flex-row items-center gap-2 mb-3 ${className ?? ''}`}>
      <AiSparklesIcon size={18} iconSize={10} />
      <Text className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
        {title}
      </Text>
    </View>
  );
}

interface AiGradientButtonProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  accessibilityLabel?: string;
}

export function AiGradientButton({
  children,
  onPress,
  disabled = false,
  size = 44,
  accessibilityLabel,
}: AiGradientButtonProps) {
  const { shimmer } = useAiGlowAnimations(!disabled);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.35, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-size, size]) },
    ],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.85}
      style={{ width: size, height: size, opacity: disabled ? 0.45 : 1 }}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
        <LinearGradient
          colors={disabled ? ['#9CA3AF', '#6B7280'] : [...AI_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!disabled && (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: size * 0.45,
                  backgroundColor: 'rgba(255,255,255,0.35)',
                },
                shimmerStyle,
              ]}
            />
          )}
          {children}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

interface AiGradientCtaProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function AiGradientCta({
  label,
  onPress,
  disabled = false,
  loading = false,
}: AiGradientCtaProps) {
  const { pulse, shimmer } = useAiGlowAnimations(!disabled && !loading);

  const ctaGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.7, 1]),
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.25, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-200, 200]) }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <AnimatedLinearGradient
        colors={disabled ? ['#9CA3AF', '#6B7280'] : [...AI_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          {
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 42,
            overflow: 'hidden',
          },
          !disabled && !loading ? ctaGlowStyle : undefined,
        ]}
      >
        {!disabled && !loading && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 80,
                backgroundColor: 'rgba(255,255,255,0.3)',
              },
              shimmerStyle,
            ]}
          />
        )}
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-sm font-medium text-white">{label}</Text>
        )}
      </AnimatedLinearGradient>
    </TouchableOpacity>
  );
}

interface AiThinkingIndicatorProps {
  label?: string;
}

export function AiThinkingIndicator({
  label = 'Analyzing your data…',
}: AiThinkingIndicatorProps) {
  const { pulse } = useAiGlowAnimations(true);

  const dot0Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.33, 0.66, 1], [1, 0.35, 0.35, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 0.33, 0.66, 1], [1, 0.85, 0.85, 1]) }],
  }));

  const dot1Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.33, 0.66, 1], [0.35, 1, 0.35, 0.35]),
    transform: [{ scale: interpolate(pulse.value, [0, 0.33, 0.66, 1], [0.85, 1, 0.85, 0.85]) }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.33, 0.66, 1], [0.35, 0.35, 1, 0.35]),
    transform: [{ scale: interpolate(pulse.value, [0, 0.33, 0.66, 1], [0.85, 0.85, 1, 0.85]) }],
  }));

  const dotStyles = [dot0Style, dot1Style, dot2Style];

  return (
    <View className="flex-row items-center gap-3 mb-3">
      <AiGlowBorder borderRadius={12} borderWidth={1} animated={false} innerClassName="bg-white dark:bg-gray-950">
        <View className="flex-row items-center gap-1.5 px-3 py-2">
          {dotStyles.map((dotStyle, index) => (
            <Animated.View
              key={index}
              style={[
                {
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: AI_GRADIENT[index % AI_GRADIENT.length],
                },
                dotStyle,
              ]}
            />
          ))}
        </View>
      </AiGlowBorder>
      <Text className="text-sm text-violet-600/80 dark:text-violet-300/80">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rotatingGradient: {
    position: 'absolute',
    top: '-60%',
    left: '-60%',
    width: '220%',
    height: '220%',
  },
  rotatingGradientFill: {
    width: '220%',
    height: '220%',
  },
});
