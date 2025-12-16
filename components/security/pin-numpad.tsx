import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Pressable, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface PinNumpadProps {
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const NUMBERS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
];

export function PinNumpad({
  onDigitPress,
  onBackspace,
  disabled = false,
}: PinNumpadProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = (value: string) => {
    if (disabled) return;

    if (value === 'backspace') {
      onBackspace();
    } else if (value !== '') {
      onDigitPress(value);
    }
  };

  return (
    <View className="w-full px-6 py-4">
      {NUMBERS.map((row, rowIndex) => (
        <View
          key={rowIndex}
          className="flex-row justify-center gap-4 mb-4"
        >
          {row.map((value, colIndex) => {
            if (value === '') {
              return <View key={`${rowIndex}-${colIndex}`} className="w-20 h-20" />;
            }

            const isBackspace = value === 'backspace';

            return (
              <NumpadButton
                key={`${rowIndex}-${colIndex}`}
                value={value}
                isBackspace={isBackspace}
                onPress={() => handlePress(value)}
                disabled={disabled}
                isDark={isDark}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

interface NumpadButtonProps {
  value: string;
  isBackspace: boolean;
  onPress: () => void;
  disabled: boolean;
  isDark: boolean;
}

function NumpadButton({
  value,
  isBackspace,
  onPress,
  disabled,
  isDark,
}: NumpadButtonProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    pressed.value = withSpring(1);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    pressed.value = withSpring(0);
  };

  // Match the lock screen's design system - solid colors like icon container
  const backgroundColor = isDark ? '#1a1a1a' : '#f3f4f6';
  const activeBackgroundColor = isDark ? '#2a2a2a' : '#e5e7eb';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#ECEDEE' : '#11181C';
  const iconColor = isDark ? '#ECEDEE' : '#11181C';

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: pressed.value === 1 ? activeBackgroundColor : backgroundColor,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          {
            width: 80,
            height: 80,
            borderRadius: 40,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 4,
            opacity: disabled ? 0.5 : 1,
          },
          containerStyle,
        ]}
      >
        {isBackspace ? (
          <Ionicons
            name="backspace-outline"
            size={28}
            color={iconColor}
          />
        ) : (
          <Text
            className="text-3xl font-semibold"
            style={{ 
              color: textColor,
              fontFamily: 'system-ui',
            }}
          >
            {value}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
