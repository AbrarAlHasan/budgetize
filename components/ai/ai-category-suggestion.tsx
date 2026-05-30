import { AiGlowBorder, AiSparklesIcon } from '@/components/ai/ai-glow';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Text, TouchableOpacity, View } from 'react-native';

interface AiCategorySuggestionProps {
  categoryName: string;
  isSuggesting: boolean;
  onPress: () => void;
}

export function AiCategorySuggestion({
  categoryName,
  isSuggesting,
  onPress,
}: AiCategorySuggestionProps) {
  const colorScheme = useColorScheme();
  const iconSurface = colorScheme === 'dark' ? '#2E1065' : '#F5F3FF';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="mt-2">
      <AiGlowBorder
        borderRadius={12}
        borderWidth={1}
        animated={false}
        innerClassName="bg-violet-50/90 dark:bg-violet-950/40"
      >
        <View className="flex-row items-center gap-2 px-3 py-2">
          <AiSparklesIcon size={20} iconSize={11} innerBackgroundColor={iconSurface} />
          <Text className="text-sm text-violet-700 dark:text-violet-300 flex-1">
            Suggest {categoryName}
            {isSuggesting ? '…' : ''}
          </Text>
        </View>
      </AiGlowBorder>
    </TouchableOpacity>
  );
}
