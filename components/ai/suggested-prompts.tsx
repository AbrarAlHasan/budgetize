import { AiGlowBorder } from '@/components/ai/ai-glow';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({
  prompts,
  onSelect,
  disabled = false,
}: SuggestedPromptsProps) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-medium text-violet-600/80 dark:text-violet-300/80 mb-2 px-1">
        Try asking
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2 px-1">
          {prompts.map((prompt) => (
            <TouchableOpacity
              key={prompt}
              onPress={() => onSelect(prompt)}
              disabled={disabled}
              activeOpacity={0.8}
            >
              {disabled ? (
                <View className="rounded-full border border-gray-200 dark:border-gray-800 px-3 py-2 opacity-50">
                  <Text className="text-sm text-gray-700 dark:text-gray-200">{prompt}</Text>
                </View>
              ) : (
                <AiGlowBorder
                  borderRadius={999}
                  borderWidth={1}
                  animated={false}
                  innerClassName="bg-white dark:bg-gray-950"
                >
                  <Text className="text-sm text-gray-700 dark:text-gray-200 px-3 py-2">
                    {prompt}
                  </Text>
                </AiGlowBorder>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export const DEFAULT_SUGGESTED_PROMPTS = [
  'How much did I spend this month?',
  'Account wise spending this month',
  'Top tags this month',
  'How much did I spend for Work?',
  'Top categories this month',
  'Compare spending to last month',
  'Compare last 3 months spending',
];
