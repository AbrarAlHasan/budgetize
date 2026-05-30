import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';

import { useExchanges } from '@/hooks/queries/use-exchanges';
import { usePeriodComparison } from '@/hooks/queries/use-reports';
import { useSpendingVelocity } from '@/hooks/queries/use-spending-velocity';
import { generateInsightsWithLlm, isAiModelReady } from '@/services/ai/ai-service';
import type { AiInsight } from '@/services/ai/types';
import { useSettingsStore } from '@/store/settings-store';

function parseInsightsJson(json: string): AiInsight[] {
  try {
    const parsed = JSON.parse(json) as AiInsight[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item) =>
          typeof item.id === 'string' &&
          typeof item.message === 'string' &&
          ['info', 'warning', 'positive'].includes(item.severity) &&
          ['velocity', 'comparison', 'exchange', 'anomaly'].includes(item.source)
      )
      .slice(0, 2);
  } catch {
    return [];
  }
}

export function useAiInsights() {
  const { settings } = useSettingsStore();
  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: velocity } = useSpendingVelocity(startDate, endDate, false);
  const { data: comparison } = usePeriodComparison(startDate, endDate, false);
  const { data: exchanges } = useExchanges({ status: 'pending' });

  return useQuery({
    queryKey: ['aiInsights', startDate, endDate, settings.aiEnabled],
    queryFn: async (): Promise<AiInsight[]> => {
      if (!settings.aiEnabled) {
        return [];
      }

      const ready = await isAiModelReady();
      if (!ready) {
        return [];
      }

      const metricsJson = JSON.stringify({
        velocity: velocity ?? null,
        comparison: comparison ?? null,
        pendingExchanges: (exchanges ?? []).slice(0, 5),
        currencyCode: settings.currency,
        period: { startDate, endDate },
      });

      const json = await generateInsightsWithLlm(metricsJson, settings.currency);
      if (!json) {
        return [];
      }

      return parseInsightsJson(json);
    },
    enabled: !!velocity || !!comparison,
    staleTime: 5 * 60 * 1000,
  });
}
