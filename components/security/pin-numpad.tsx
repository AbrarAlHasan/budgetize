import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Text, TouchableOpacity, View } from 'react-native';
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const buttonBg = isDark
    ? 'bg-gray-800/50 border-gray-700/50'
    : 'bg-white/80 border-gray-200/50';
  const buttonActive = isDark
    ? 'active:bg-gray-700/50'
    : 'active:bg-gray-100/80';
  const textColor = isDark ? 'text-white' : 'text-gray-900';

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        className={`
          w-20 h-20 rounded-2xl items-center justify-center
          ${buttonBg} ${buttonActive}
          border
          ${disabled ? 'opacity-50' : ''}
        `}
        style={{
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        activeOpacity={0.7}
      >
        {isBackspace ? (
          <Ionicons
            name="backspace-outline"
            size={28}
            color={isDark ? '#ffffff' : '#111827'}
          />
        ) : (
          <Text
            className={`text-3xl font-semibold ${textColor}`}
            style={{ fontFamily: 'system-ui' }}
          >
            {value}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
