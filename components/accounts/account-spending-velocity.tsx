import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccountSpendingVelocity } from '@/hooks/queries/use-account-spending-velocity';
import { getCurrencySymbol } from '@/utils/currencies';
import { useSettingsStore } from '@/store/settings-store';
import { useColorScheme } from 'nativewind';
import {
  buildSpendingVelocityInsight,
  getPaceStatusColor,
  getPaceStatusLabel,
} from '@/utils/spending-velocity';

interface AccountSpendingVelocityProps {
  accountId: number;
}

export function AccountSpendingVelocity({
  accountId,
}: AccountSpendingVelocityProps) {
  const { settings } = useSettingsStore();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { data: velocity, isLoading } = useAccountSpendingVelocity(accountId);

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
    'month end'
  );

  const paceComparisonLabel =
    velocity.paceVsPriorPercent !== null
      ? `${velocity.paceVsPriorPercent.toFixed(0)}% vs prior period`
      : velocity.priorToDateSpending === 0
        ? 'No prior-period spend'
        : 'Building baseline';

  const labelColor = isDark ? '#9CA3AF' : '#6B7280';
  const valueColor = isDark ? '#F9FAFB' : '#111827';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="speedometer-outline" size={20} color={statusColor} />
          <Text style={[styles.title, { color: valueColor }]}>
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
            <Text style={[styles.metricLabel, { color: labelColor }]}>
              Spent so far
            </Text>
            <Text style={[styles.metricValue, { color: valueColor }]}>
              {formatAmount(velocity.currentSpending)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: labelColor }]}>
              Projected month end
            </Text>
            <Text style={[styles.metricValue, { color: valueColor }]}>
              {velocity.canProject
                ? formatAmount(velocity.projectedPeriodEndSpending)
                : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: labelColor }]}>
              Calendar daily avg
            </Text>
            <Text style={[styles.metricValueSmall, { color: valueColor }]}>
              {formatAmount(velocity.averageDailySpending)}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: labelColor }]}>
              Active spending days
            </Text>
            <Text style={[styles.metricValueSmall, { color: valueColor }]}>
              {velocity.activeSpendingDays}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Text style={[styles.progressSectionLabel, { color: labelColor }]}>
            Period elapsed
          </Text>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
            ]}
          >
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
            <Text style={[styles.progressLabel, { color: labelColor }]}>
              {velocity.daysElapsed} of {velocity.totalDaysInPeriod} days
            </Text>
            <Text style={[styles.progressLabel, { color: labelColor }]}>
              {paceComparisonLabel}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.insightContainer,
            { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={labelColor}
          />
          <Text style={[styles.insightText, { color: isDark ? '#D1D5DB' : '#6B7280' }]}>
            {insight}
            {velocity.daysRemaining > 0
              ? ` ${velocity.daysRemaining} day(s) left this month.`
              : ''}
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
  metricValueSmall: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressContainer: {
    gap: 8,
  },
  progressSectionLabel: {
    fontSize: 12,
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
