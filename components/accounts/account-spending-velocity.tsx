import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccountSpendingVelocity } from '@/hooks/queries/use-account-spending-velocity';
import { getCurrencySymbol } from '@/utils/currencies';
import { useSettingsStore } from '@/store/settings-store';
import { useColorScheme } from 'nativewind';

interface AccountSpendingVelocityProps {
  accountId: number;
}

export function AccountSpendingVelocity({ accountId }: AccountSpendingVelocityProps) {
  const { settings } = useSettingsStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { data: velocity, isLoading } = useAccountSpendingVelocity(accountId);

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
    <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="speedometer-outline" size={20} color={statusColor} />
          <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#111827' }]}>Spending Velocity</Text>
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
            <Text style={[styles.metricLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Daily Average</Text>
            <Text style={[styles.metricValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>{formatAmount(velocity.averageDailySpending)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>Projected Month End</Text>
            <Text style={[styles.metricValue, { color: isDark ? '#F9FAFB' : '#111827' }]}>{formatAmount(velocity.projectedMonthEndSpending)}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
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
            <Text style={[styles.progressLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {velocity.daysElapsed} of {velocity.totalDaysInMonth} days
            </Text>
            <Text style={[styles.progressLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {velocity.spendingProgress.toFixed(0)}% of projection
            </Text>
          </View>
        </View>

        {/* Insight Text */}
        <View style={[styles.insightContainer, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
          <Ionicons name="information-circle-outline" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={[styles.insightText, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
            {velocity.spendingProgress <= 50 
              ? `You're spending at a healthy pace. ${velocity.daysRemaining} days remaining.`
              : velocity.spendingProgress <= 75
              ? `Spending is moderate. At this rate, you'll reach ${formatAmount(velocity.projectedMonthEndSpending)} by month end.`
              : `Spending is high. Consider reviewing expenses. Projected: ${formatAmount(velocity.projectedMonthEndSpending)}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
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
  title: {
    fontSize: 16,
    fontWeight: '600',
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
  metricLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});

