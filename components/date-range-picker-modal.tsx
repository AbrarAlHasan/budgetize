import { cn } from '@/utils/cn';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, fromDateId, toDateId } from '@marceloterreiro/flash-calendar';
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface DateRangePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

export function DateRangePickerModal({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}: DateRangePickerModalProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonthId, setCurrentMonthId] = useState<string>(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return toDateId(firstDayOfMonth);
  });
  const [selectingStart, setSelectingStart] = useState(true);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setStartDate(null);
      setEndDate(null);
      setSelectingStart(true);
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setCurrentMonthId(toDateId(firstDayOfMonth));
    }
  }, [visible]);

  const handleDateSelect = (dateId: string) => {
    const selectedDate = fromDateId(dateId);
    const selectedDateStart = startOfDay(selectedDate);

    if (selectingStart) {
      // If selecting start date and end date exists and selected date is after end date, reset end date
      if (endDate && isAfter(selectedDateStart, startOfDay(endDate))) {
        setEndDate(null);
      }
      setStartDate(selectedDateStart);
      setSelectingStart(false);
    } else {
      // Selecting end date
      if (!startDate) {
        // If no start date, set it as start
        setStartDate(selectedDateStart);
        setSelectingStart(false);
      } else {
        // If selected date is before start date, swap them
        if (isBefore(selectedDateStart, startOfDay(startDate))) {
          setEndDate(startDate);
          setStartDate(selectedDateStart);
        } else {
          setEndDate(selectedDateStart);
        }
        setSelectingStart(true);
      }
    }
  };

  const handlePreviousMonth = () => {
    const currentMonth = fromDateId(currentMonthId);
    const previousMonth = subMonths(currentMonth, 1);
    setCurrentMonthId(toDateId(startOfMonth(previousMonth)));
  };

  const handleNextMonth = () => {
    const currentMonth = fromDateId(currentMonthId);
    const nextMonth = addMonths(currentMonth, 1);
    setCurrentMonthId(toDateId(startOfMonth(nextMonth)));
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      // Format dates as YYYY-MM-DD for database queries
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      onConfirm(startDateStr, endDateStr);
    }
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectingStart(true);
  };

  const canConfirm = startDate !== null && endDate !== null && !isLoading;

  // Get current month display text
  const currentMonthDisplay = format(fromDateId(currentMonthId), 'MMMM yyyy');

  // Determine date range for calendar highlighting
  const getDateRange = () => {
    if (!startDate) return [];
    if (!endDate) {
      return [{ startId: toDateId(startDate), endId: toDateId(startDate) }];
    }
    return [{ startId: toDateId(startDate), endId: toDateId(endDate) }];
  };

  // Check if a date is in the selected range (but not a boundary)
  const isDateInRange = (dateId: string): boolean => {
    if (!startDate || !endDate) return false;
    
    // Use dateId comparison for more reliable matching
    const startDateId = toDateId(startDate);
    const endDateId = toDateId(endDate);
    
    // Check if it's a boundary date first
    if (dateId === startDateId || dateId === endDateId) {
      return false;
    }
    
    // Compare dateIds directly (they're in YYYY-MM-DD format)
    return dateId > startDateId && dateId < endDateId;
  };

  // Check if a date is the start date
  const isStartDate = (dateId: string): boolean => {
    if (!startDate) return false;
    return dateId === toDateId(startDate);
  };

  // Check if a date is the end date
  const isEndDate = (dateId: string): boolean => {
    if (!endDate) return false;
    return dateId === toDateId(endDate);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
        disabled={isLoading}
      >
        <Pressable
          className="bg-white dark:bg-gray-800 rounded-t-3xl"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="p-4">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Select Date Range
              </Text>
              <TouchableOpacity onPress={onClose} disabled={isLoading}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Date Range Display */}
            <View className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Start Date
                  </Text>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {startDate
                      ? format(startDate, 'MMM dd, yyyy')
                      : 'Not selected'}
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#9CA3AF"
                  style={{ marginHorizontal: 12 }}
                />
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    End Date
                  </Text>
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {endDate
                      ? format(endDate, 'MMM dd, yyyy')
                      : 'Not selected'}
                  </Text>
                </View>
              </View>
              {startDate && endDate && (
                <TouchableOpacity
                  onPress={handleReset}
                  className="mt-2 self-start"
                  disabled={isLoading}
                >
                  <Text className="text-sm text-blue-600 dark:text-blue-400">
                    Reset Selection
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Month Navigation */}
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity
                onPress={handlePreviousMonth}
                className="p-2"
                disabled={isLoading}
              >
                <Ionicons name="chevron-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentMonthDisplay}
              </Text>
              <TouchableOpacity
                onPress={handleNextMonth}
                className="p-2"
                disabled={isLoading}
              >
                <Ionicons name="chevron-forward" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <View className="mb-4" style={{ minHeight: 300 }}>
              <Calendar
                calendarMonthId={currentMonthId}
                calendarActiveDateRanges={getDateRange()}
                onCalendarDayPress={handleDateSelect}
                calendarFirstDayOfWeek="sunday"
                calendarDayHeight={44}
                calendarRowVerticalSpacing={6}
                calendarRowHorizontalSpacing={6}
                theme={{
                  itemDayContainer: {
                    activeDayFiller: {
                      backgroundColor: '#EFF6FF', // Match the range background color
                    },
                  },
                  itemDay: {
                    base: ({ isPressed, dateId }: { isPressed: boolean; dateId?: string }) => {
                      if (!dateId) {
                        return {
                          container: { backgroundColor: 'transparent' },
                          content: { color: '#9CA3AF' },
                        };
                      }

                      const date = fromDateId(dateId);
                      const today = startOfDay(new Date());
                      const isToday = isSameDay(date, today);

                      return {
                        container: {
                          backgroundColor: isPressed ? '#F3F4F6' : '#FFFFFF',
                          borderRadius: 0,
                          borderWidth: isToday ? 1.5 : 0,
                          borderColor: isToday ? '#3B82F6' : 'transparent',
                        },
                        content: {
                          color: isToday ? '#3B82F6' : '#111827',
                          fontWeight: isToday ? '600' : '400',
                          fontSize: 15,
                        },
                      };
                    },
                    active: ({ isPressed, isStartOfRange, isEndOfRange }: { isPressed: boolean; isStartOfRange: boolean; isEndOfRange: boolean }) => {
                      const isRangeBoundary = isStartOfRange || isEndOfRange;
                      const isInRange = !isStartOfRange && !isEndOfRange;

                      // Background color
                      let backgroundColor = '#3B82F6';
                      if (isInRange) {
                        backgroundColor = '#EFF6FF';
                      } else if (isPressed) {
                        backgroundColor = '#2563EB';
                      }

                      // Text color
                      let textColor = '#FFFFFF';
                      if (isInRange) {
                        textColor = '#1E40AF';
                      }

                      // Border radius - only for start and end dates
                      let borderRadius = 0;
                      if (isStartOfRange && !isEndOfRange) {
                        borderRadius = 8;
                        // Only round left side for start
                        return {
                          container: {
                            backgroundColor,
                            borderTopLeftRadius: 8,
                            borderBottomLeftRadius: 8,
                          },
                          content: {
                            color: textColor,
                            fontWeight: '600',
                            fontSize: 15,
                          },
                        };
                      } else if (isEndOfRange && !isStartOfRange) {
                        borderRadius = 8;
                        // Only round right side for end
                        return {
                          container: {
                            backgroundColor,
                            borderTopRightRadius: 8,
                            borderBottomRightRadius: 8,
                          },
                          content: {
                            color: textColor,
                            fontWeight: '600',
                            fontSize: 15,
                          },
                        };
                      } else if (isStartOfRange && isEndOfRange) {
                        // Single date selection
                        borderRadius = 8;
                      }

                      return {
                        container: {
                          backgroundColor,
                          borderRadius,
                        },
                        content: {
                          color: textColor,
                          fontWeight: isRangeBoundary ? '600' : '400',
                          fontSize: 15,
                        },
                      };
                    },
                    today: () => ({
                      container: {
                        borderWidth: 1.5,
                        borderColor: '#3B82F6',
                        borderRadius: 0,
                      },
                      content: {
                        color: '#111827',
                        fontWeight: '500',
                      },
                    }),
                  },
                }}
              />
            </View>

            {/* Instructions */}
            <View className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Text className="text-sm text-blue-800 dark:text-blue-200">
                {selectingStart
                  ? 'Select the start date for your export'
                  : 'Select the end date for your export'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TouchableOpacity
                  onPress={onClose}
                  className="border border-gray-300 dark:border-gray-600 rounded-lg py-3 items-center"
                  disabled={isLoading}
                >
                  <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <TouchableOpacity
                  onPress={handleConfirm}
                  className={cn(
                    'rounded-lg py-3 items-center flex-row justify-center',
                    canConfirm
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  )}
                  disabled={!canConfirm}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-medium text-white">
                      Export
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

