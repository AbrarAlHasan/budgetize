import { transactionRepository } from '@/repositories/transaction.repository';
import { useSettingsStore } from '@/store/settings-store';
import { getCurrencySymbol } from '@/utils/currencies';
import { logError, logPerformance } from '@/utils/logger';
import { ExtensionStorage } from '@bacons/apple-targets';
import {
  differenceInDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns';

// App Group identifier - must match the one in app.json and widget entitlements
const APP_GROUP_ID = 'group.widget.com.suzukibusinesscloud.SalesQA-3.0';

// Storage keys for widget data
const WIDGET_DATA_KEY = 'widgetSpendData';
const WIDGET_LAST_UPDATED_KEY = 'widgetLastUpdated';

export interface WidgetSpendData {
  todaySpent: string;
  thisWeekSpent: string;
  thisMonthSpent: string;
  dailyAverage: string;
  projectSpendForMonth: string;
  totalDays: number;
  totalDaysCompleted: number;
  currencySymbol: string;
}

/**
 * Format amount for widget display
 * Handles large numbers with K, M suffixes
 */
function formatAmountForWidget(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M';
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toFixed(0);
}

/**
 * Calculate all widget spending metrics and store them in shared UserDefaults
 */
export async function syncWidgetData(): Promise<void> {
  const startTime = Date.now();
  logPerformance('syncWidgetData started', 0);

  try {
    const now = new Date();
    
    // Get currency from settings
    const currency = useSettingsStore.getState().settings.currency;
    const currencySymbol = getCurrencySymbol(currency);

    // Calculate date ranges
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const dayStartDate = format(dayStart, 'yyyy-MM-dd');
    const dayEndDate = format(dayEnd, 'yyyy-MM-dd');
    const weekStartDate = format(weekStart, 'yyyy-MM-dd');
    const weekEndDate = format(weekEnd, 'yyyy-MM-dd');
    const monthStartDate = format(monthStart, 'yyyy-MM-dd');
    const monthEndDate = format(monthEnd, 'yyyy-MM-dd');

    // Calculate days for month
    const totalDaysInMonth = getDaysInMonth(now);
    const daysElapsed = differenceInDays(now, monthStart) + 1; // +1 to include today

    // Fetch all spending data in parallel for better performance
    const [todaySpending, weekSpending, monthSpending] = await Promise.all([
      transactionRepository.calculateAccountExpensesForDateRange({
        startDate: dayStartDate,
        endDate: dayEndDate,
        types: ['expense'],
      }),
      transactionRepository.calculateAccountExpensesForDateRange({
        startDate: weekStartDate,
        endDate: weekEndDate,
        types: ['expense'],
      }),
      transactionRepository.calculateAccountExpensesForDateRange({
        startDate: monthStartDate,
        endDate: monthEndDate,
        types: ['expense'],
      }),
    ]);

    // Calculate metrics
    const dailyAverage = daysElapsed > 0 ? monthSpending / daysElapsed : 0;
    const projectedMonthEndSpending = dailyAverage * totalDaysInMonth;

    // Format amounts for display
    const widgetData: WidgetSpendData = {
      todaySpent: formatAmountForWidget(todaySpending),
      thisWeekSpent: formatAmountForWidget(weekSpending),
      thisMonthSpent: formatAmountForWidget(monthSpending),
      dailyAverage: formatAmountForWidget(dailyAverage),
      projectSpendForMonth: formatAmountForWidget(projectedMonthEndSpending),
      totalDays: totalDaysInMonth,
      totalDaysCompleted: daysElapsed,
      currencySymbol,
    };

    // Store in shared UserDefaults using ExtensionStorage
    const storage = new ExtensionStorage(APP_GROUP_ID);
    // ExtensionStorage.set() handles JSON serialization automatically for objects
    storage.set(WIDGET_DATA_KEY, widgetData as any);
    storage.set(WIDGET_LAST_UPDATED_KEY, now.toISOString());

    // Reload widget timeline
    ExtensionStorage.reloadWidget('widget');

    const endTime = Date.now();
    logPerformance('syncWidgetData completed', endTime - startTime);
  } catch (error) {
    logError('Error syncing widget data:', error);
    throw error;
  }
}

/**
 * Get the last updated timestamp for widget data
 */
export function getWidgetLastUpdated(): string | null {
  try {
    const storage = new ExtensionStorage(APP_GROUP_ID);
    return storage.get(WIDGET_LAST_UPDATED_KEY);
  } catch (error) {
    logError('Error getting widget last updated:', error);
    return null;
  }
}

/**
 * Get cached widget data (for debugging/testing)
 */
export function getCachedWidgetData(): WidgetSpendData | null {
  try {
    const storage = new ExtensionStorage(APP_GROUP_ID);
    const data = storage.get(WIDGET_DATA_KEY);
    if (!data) return null;
    // ExtensionStorage.get() returns a string, parse it
    return JSON.parse(data) as WidgetSpendData;
  } catch (error) {
    logError('Error getting cached widget data:', error);
    return null;
  }
}
