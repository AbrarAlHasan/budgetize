import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSpendingVelocity } from '@/hooks/queries/use-spending-velocity';
import { getCurrencySymbol } from '@/utils/currencies';
import { useSettingsStore } from '@/store/settings-store';
import { useColorScheme } from 'nativewind';
import { Card } from '@/components/ui/card';
import {
  buildSpendingVelocityInsight,
  getPaceStatusColor,
  getPaceStatusLabel,
} from '@/utils/spending-velocity';

interface SpendingVelocityProps {
  startDate: string;
  endDate: string;
  useFilters: boolean;
}

export function SpendingVelocity({
  startDate,
  endDate,
  useFilters,
}: SpendingVelocityProps) {
  const { settings } = useSettingsStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { data: velocity, isLoading } = useSpendingVelocity(
    startDate,
    endDate,
    useFilters
  );

  if (isLoading || !velocity) {
    return null;
  }

  const currencySymbol = getCurrencySymbol(settings.currency);

  const formatAmount = (amount: number): string => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `${currencySymbol}${(absAmount / 10000000).toFixed(1)}Cr`;
    }
    if (absAmount >= 100000) {
      return `${currencySymbol}${(absAmount / 100000).toFixed(1)}L`;
    }
    if (absAmount >= 1000) {
      return `${currencySymbol}${(absAmount / 1000).toFixed(1)}k`;
    }
    return `${currencySymbol}${absAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const statusColor = getPaceStatusColor(velocity.paceStatus);
  const periodBarColor = isDark ? '#3B82F6' : '#2563EB';
  const insight = buildSpendingVelocityInsight(
    velocity,
    formatAmount,
    'period end'
  );

  const paceComparisonLabel =
    velocity.paceVsPriorPercent !== null
      ? `${velocity.paceVsPriorPercent.toFixed(0)}% vs prior period`
      : velocity.priorToDateSpending === 0
        ? 'No prior-period spend'
        : 'Building baseline';

  return (
    <Card className="mb-6">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="speedometer-outline" size={20} color={statusColor} />
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Spending Velocity
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {getPaceStatusLabel(velocity.paceStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Spent so far
            </Text>
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(velocity.currentSpending)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Projected period end
            </Text>
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {velocity.canProject
                ? formatAmount(velocity.projectedPeriodEndSpending)
                : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Calendar daily avg
            </Text>
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatAmount(velocity.averageDailySpending)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Active spending days
            </Text>
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {velocity.activeSpendingDays}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Period elapsed
          </Text>
          <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(velocity.periodProgress, 100)}%`,
                  backgroundColor: periodBarColor,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {velocity.daysElapsed} of {velocity.totalDaysInPeriod} days
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {paceComparisonLabel}
            </Text>
          </View>
        </View>

        <View className="flex-row items-start gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <Text className="text-xs text-gray-600 dark:text-gray-300 flex-1 leading-4">
            {insight}
            {velocity.daysRemaining > 0
              ? ` ${velocity.daysRemaining} day(s) left in this period.`
              : ''}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    gap: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metric: {
    flex: 1,
  },
  progressContainer: {
    gap: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
