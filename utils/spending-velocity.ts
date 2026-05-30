/**
 * Spending velocity: linear projection from calendar daily average,
 * with pace status compared to the prior period of equal length (not calendar %).
 */

export type SpendingPaceStatus =
  | 'light'
  | 'early'
  | 'on_track'
  | 'moderate'
  | 'elevated'
  | 'high';

export interface SpendingVelocityInput {
  currentSpending: number;
  daysElapsed: number;
  totalDaysInPeriod: number;
  activeSpendingDays: number;
  /** Expenses in the prior period over the same number of elapsed days. */
  priorToDateSpending: number;
}

export interface SpendingVelocityResult {
  currentSpending: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDaysInPeriod: number;
  activeSpendingDays: number;
  averageDailySpending: number;
  projectedPeriodEndSpending: number;
  /** Share of the period's calendar time that has elapsed (0–100). */
  periodProgress: number;
  priorToDateSpending: number;
  /** Projected total vs prior period at the same day count (null when not comparable). */
  paceVsPriorPercent: number | null;
  paceStatus: SpendingPaceStatus;
  canProject: boolean;
}

const MIN_DAYS_FOR_PROJECTION = 3;
const MIN_ACTIVE_DAYS_FOR_PROJECTION = 2;

export function deriveSpendingVelocityMetrics(
  input: SpendingVelocityInput
): SpendingVelocityResult {
  const {
    currentSpending,
    daysElapsed,
    totalDaysInPeriod,
    activeSpendingDays,
    priorToDateSpending,
  } = input;

  const daysRemaining = Math.max(0, totalDaysInPeriod - daysElapsed);
  const periodProgress =
    totalDaysInPeriod > 0 ? (daysElapsed / totalDaysInPeriod) * 100 : 0;

  const averageDailySpending =
    daysElapsed > 0 ? currentSpending / daysElapsed : 0;
  const projectedPeriodEndSpending =
    averageDailySpending * totalDaysInPeriod;

  const priorPaceProjection =
    daysElapsed > 0
      ? (priorToDateSpending / daysElapsed) * totalDaysInPeriod
      : 0;

  const canProject =
    daysElapsed >= MIN_DAYS_FOR_PROJECTION &&
    (activeSpendingDays >= MIN_ACTIVE_DAYS_FOR_PROJECTION ||
      daysElapsed >= 7);

  let paceStatus: SpendingPaceStatus = 'on_track';
  let paceVsPriorPercent: number | null = null;

  if (currentSpending <= 0) {
    paceStatus = 'light';
  } else if (!canProject) {
    paceStatus = 'early';
  } else if (priorPaceProjection > 0) {
    paceVsPriorPercent =
      (projectedPeriodEndSpending / priorPaceProjection) * 100;

    if (paceVsPriorPercent <= 85) {
      paceStatus = 'on_track';
    } else if (paceVsPriorPercent <= 110) {
      paceStatus = 'moderate';
    } else if (paceVsPriorPercent <= 130) {
      paceStatus = 'elevated';
    } else {
      paceStatus = 'high';
    }
  } else if (priorToDateSpending === 0 && currentSpending > 0) {
    paceStatus = 'moderate';
  } else {
    paceStatus = 'on_track';
  }

  return {
    currentSpending,
    daysElapsed,
    daysRemaining,
    totalDaysInPeriod,
    activeSpendingDays,
    averageDailySpending,
    projectedPeriodEndSpending,
    periodProgress,
    priorToDateSpending,
    paceVsPriorPercent,
    paceStatus,
    canProject,
  };
}

export function buildSpendingVelocityInsight(
  velocity: SpendingVelocityResult,
  formatAmount: (amount: number) => string,
  periodEndLabel: string
): string {
  const projected = formatAmount(velocity.projectedPeriodEndSpending);
  const spent = formatAmount(velocity.currentSpending);

  switch (velocity.paceStatus) {
    case 'light':
      return 'No expenses recorded in this period yet.';
    case 'early':
      return `${spent} spent so far across ${velocity.activeSpendingDays} active day(s). More data is needed before pace comparisons are reliable.`;
    case 'on_track':
      if (velocity.paceVsPriorPercent !== null) {
        return `Spent ${spent} so far. Projected ${projected} by ${periodEndLabel} — on pace with the prior period at the same point.`;
      }
      return `Spent ${spent} so far. Projected ${projected} by ${periodEndLabel} at your current calendar daily average.`;
    case 'moderate':
      return `Spent ${spent} so far. Projected ${projected} by ${periodEndLabel}, close to your prior-period pace.`;
    case 'elevated':
      return `Spent ${spent} so far. Projected ${projected} by ${periodEndLabel}, above your prior-period pace.`;
    case 'high':
      return `Spent ${spent} so far. Projected ${projected} by ${periodEndLabel} — well above your prior-period pace. Review recent expenses.`;
  }
}

export function getPaceStatusColor(status: SpendingPaceStatus): string {
  switch (status) {
    case 'light':
    case 'early':
    case 'on_track':
      return '#10B981';
    case 'moderate':
      return '#F59E0B';
    case 'elevated':
    case 'high':
      return '#EF4444';
  }
}

export function getPaceStatusLabel(status: SpendingPaceStatus): string {
  switch (status) {
    case 'light':
      return 'Light';
    case 'early':
      return 'Early';
    case 'on_track':
      return 'On track';
    case 'moderate':
      return 'Moderate';
    case 'elevated':
      return 'Elevated';
    case 'high':
      return 'High';
  }
}
