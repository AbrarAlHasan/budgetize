import { AiGlowBorder } from '@/components/ai/ai-glow';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Text, View } from 'react-native';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  success?: boolean;
}

export function ChatMessage({ role, content, success = true }: ChatMessageProps) {
  const colorScheme = useColorScheme();
  const isUser = role === 'user';
  const isDark = colorScheme === 'dark';

  if (isUser) {
    return (
      <View className="mb-3 items-end">
        <View className="max-w-[85%] rounded-2xl bg-blue-500 px-4 py-3">
          <Text className="text-[15px] leading-6 text-white">{content}</Text>
        </View>
      </View>
    );
  }

  const innerClassName = success
    ? isDark
      ? 'bg-gray-950'
      : 'bg-white'
    : isDark
      ? 'bg-red-950/60'
      : 'bg-red-50';

  const bubble = (
    <View className="px-4 py-3">
      <Text
        className={`text-[15px] leading-6 ${
          success
            ? isDark
              ? 'text-gray-100'
              : 'text-gray-900'
            : isDark
              ? 'text-red-200'
              : 'text-red-900'
        }`}
      >
        {content}
      </Text>
    </View>
  );

  return (
    <View className="mb-3 items-start max-w-[85%]">
      {success ? (
        <AiGlowBorder borderRadius={16} animated={false} innerClassName={innerClassName}>
          {bubble}
        </AiGlowBorder>
      ) : (
        <View
          className={`rounded-2xl border ${
            isDark ? 'border-red-900/50 bg-red-950/40' : 'border-red-100 bg-red-50'
          }`}
        >
          {bubble}
        </View>
      )}
    </View>
  );
}
