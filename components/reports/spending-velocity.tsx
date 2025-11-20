import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSpendingVelocity } from '@/hooks/queries/use-spending-velocity';
import { getCurrencySymbol } from '@/utils/currencies';
import { useSettingsStore } from '@/store/settings-store';
import { useColorScheme } from 'nativewind';
import { Card } from '@/components/ui/card';

interface SpendingVelocityProps {
  startDate: string;
  endDate: string;
  useFilters: boolean;
}

export function SpendingVelocity({ startDate, endDate, useFilters }: SpendingVelocityProps) {
  const { settings } = useSettingsStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { data: velocity, isLoading } = useSpendingVelocity(startDate, endDate, useFilters);

  if (isLoading || !velocity) {
    return null;
  }

  const currencySymbol = getCurrencySymbol(settings.currency);

  // Format amounts
  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `${currencySymbol}${(absAmount / 10000000).toFixed(1)}Cr`;
    } else if (absAmount >= 100000) {
      return `${currencySymbol}${(absAmount / 100000).toFixed(1)}L`;
    } else if (absAmount >= 1000) {
      return `${currencySymbol}${(absAmount / 1000).toFixed(1)}k`;
    }
    return `${currencySymbol}${absAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  // Determine status color based on spending progress
  const getStatusColor = () => {
    if (velocity.spendingProgress <= 50) {
      return '#10B981'; // Green - on track
    } else if (velocity.spendingProgress <= 75) {
      return '#F59E0B'; // Amber - moderate
    } else {
      return '#EF4444'; // Red - high spending
    }
  };

  const statusColor = getStatusColor();

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
            {velocity.spendingProgress <= 50 ? 'On Track' : 
             velocity.spendingProgress <= 75 ? 'Moderate' : 'High'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Daily Average</Text>
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(velocity.averageDailySpending)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">Projected Period End</Text>
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(velocity.projectedPeriodEndSpending)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(velocity.spendingProgress, 100)}%`,
                  backgroundColor: statusColor,
                }
              ]} 
            />
          </View>
          <View style={styles.progressLabels}>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {velocity.daysElapsed} of {velocity.totalDaysInPeriod} days
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {velocity.spendingProgress.toFixed(0)}% of projection
            </Text>
          </View>
        </View>

        {/* Insight Text */}
        <View className="flex-row items-start gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <Ionicons name="information-circle-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text className="text-xs text-gray-600 dark:text-gray-300 flex-1 leading-4">
            {velocity.spendingProgress <= 50 
              ? `You're spending at a healthy pace. ${velocity.daysRemaining} days remaining.`
              : velocity.spendingProgress <= 75
              ? `Spending is moderate. At this rate, you'll reach ${formatAmount(velocity.projectedPeriodEndSpending)} by period end.`
              : `Spending is high. Consider reviewing expenses. Projected: ${formatAmount(velocity.projectedPeriodEndSpending)}`}
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

