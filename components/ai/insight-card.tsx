import { AiGlowBorder } from '@/components/ai/ai-glow';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import type { AiInsight } from '@/services/ai/types';

interface InsightCardProps {
  insight: AiInsight;
}

const SEVERITY_STYLES: Record<
  AiInsight['severity'],
  { inner: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  info: {
    inner: 'bg-blue-50/90 dark:bg-blue-950/40',
    icon: 'information-circle-outline',
    color: '#3B82F6',
  },
  warning: {
    inner: 'bg-amber-50/90 dark:bg-amber-950/40',
    icon: 'alert-circle-outline',
    color: '#D97706',
  },
  positive: {
    inner: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    icon: 'trending-down-outline',
    color: '#059669',
  },
};

export function InsightCard({ insight }: InsightCardProps) {
  const style = SEVERITY_STYLES[insight.severity];

  return (
    <View className="mb-3">
      <AiGlowBorder borderRadius={16} innerClassName={style.inner}>
        <View className="flex-row items-start gap-3 p-4">
          <Ionicons name={style.icon} size={20} color={style.color} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-sm leading-5 text-gray-800 dark:text-gray-100">
            {insight.message}
          </Text>
        </View>
      </AiGlowBorder>
    </View>
  );
}
