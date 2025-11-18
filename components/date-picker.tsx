import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Calendar, toDateId, fromDateId } from '@marceloterreiro/flash-calendar';
import { format, addMonths, subMonths, startOfMonth, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/utils/cn';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  error?: string;
  className?: string;
  minDate?: Date | null;
  maxDate?: Date | null;
}

export interface DatePickerRef {
  open: () => void;
}

export const DatePicker = forwardRef<DatePickerRef, DatePickerProps>(({
  label,
  value,
  onChange,
  mode = 'date',
  error,
  className,
  minDate,
  maxDate,
}, ref) => {
  const [show, setShow] = useState(false);
  const [selectedDateId, setSelectedDateId] = useState<string>(() => 
    value ? toDateId(value) : toDateId(new Date())
  );
  const [currentMonthId, setCurrentMonthId] = useState<string>(() => {
    const date = value || new Date();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    return toDateId(firstDayOfMonth);
  });

  const displayDate = value ? format(value, 'MMM dd, yyyy') : 'Select date';

  // Update current month when modal opens
  useEffect(() => {
    if (show) {
      const date = value || new Date();
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      setCurrentMonthId(toDateId(firstDayOfMonth));
    }
  }, [show, value]);

  const handleDateSelect = (dateId: string) => {
    const selectedDate = fromDateId(dateId);
    const selectedDateStart = startOfDay(selectedDate);

    // Validate against minDate
    if (minDate && isBefore(selectedDateStart, startOfDay(minDate))) {
      return; // Don't allow selection
    }

    // Validate against maxDate
    if (maxDate && isBefore(startOfDay(maxDate), selectedDateStart)) {
      return; // Don't allow selection
    }

    setSelectedDateId(dateId);
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
    const selectedDate = fromDateId(selectedDateId);
    const selectedDateStart = startOfDay(selectedDate);

    // Final validation before confirming
    if (minDate && isBefore(selectedDateStart, startOfDay(minDate))) {
      return; // Don't allow confirmation
    }

    if (maxDate && isBefore(startOfDay(maxDate), selectedDateStart)) {
      return; // Don't allow confirmation
    }

    // Preserve the time from the original value if mode includes time
    if (value && (mode === 'time' || mode === 'datetime')) {
      selectedDate.setHours(value.getHours());
      selectedDate.setMinutes(value.getMinutes());
      selectedDate.setSeconds(value.getSeconds());
    }
    onChange(selectedDate);
    setShow(false);
  };

  const handleCancel = () => {
    if (value) {
      setSelectedDateId(toDateId(value));
    }
    setShow(false);
  };

  const handleOpen = () => {
    if (value) {
      setSelectedDateId(toDateId(value));
    }
    setShow(true);
  };

  useImperativeHandle(ref, () => ({
    open: handleOpen,
  }));

  // Get current month display text
  const currentMonthDisplay = useMemo(() => {
    const month = fromDateId(currentMonthId);
    return format(month, 'MMMM yyyy');
  }, [currentMonthId]);

  return (
    <View className={cn('mb-4', className)}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={handleOpen}
        className={cn(
          'border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 flex-row justify-between items-center',
          'bg-white dark:bg-gray-800',
          error && 'border-red-500'
        )}
      >
        <Text className="text-gray-900 dark:text-gray-100">{displayDate}</Text>
        <Ionicons name="calendar" size={20} color="#6B7280" />
      </TouchableOpacity>
      {error && (
        <Text className="mt-1 text-sm text-red-500">{error}</Text>
      )}

      <Modal visible={show} transparent animationType="slide">
        <Pressable 
          className="flex-1 bg-black/50 justify-end"
          onPress={handleCancel}
        >
          <Pressable 
            className="bg-white dark:bg-gray-800 rounded-t-3xl"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {label || 'Select Date'}
                </Text>
                <TouchableOpacity onPress={handleCancel}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Month Navigation */}
              <View className="flex-row justify-between items-center mb-4">
                <TouchableOpacity
                  onPress={handlePreviousMonth}
                  className="p-2"
                >
                  <Ionicons name="chevron-back" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currentMonthDisplay}
                </Text>
                <TouchableOpacity
                  onPress={handleNextMonth}
                  className="p-2"
                >
                  <Ionicons name="chevron-forward" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <View className="mb-4" style={{ minHeight: 300 }}>
                <Calendar
                  calendarMonthId={currentMonthId}
                  calendarActiveDateRanges={[
                    {
                      startId: selectedDateId,
                      endId: selectedDateId,
                    },
                  ]}
                  onCalendarDayPress={handleDateSelect}
                  calendarFirstDayOfWeek="sunday"
                  calendarDayHeight={40}
                  calendarRowVerticalSpacing={8}
                  calendarRowHorizontalSpacing={8}
                  theme={{
                    itemDay: {
                      base: ({ isPressed, dateId }: { isPressed: boolean; dateId?: string }) => {
                        let isDisabled = false;
                        if (dateId && (minDate || maxDate)) {
                          try {
                            const date = fromDateId(dateId);
                            const dateStart = startOfDay(date);
                            isDisabled = 
                              (minDate && isBefore(dateStart, startOfDay(minDate))) ||
                              (maxDate && isBefore(startOfDay(maxDate), dateStart));
                          } catch (e) {
                            // If dateId is invalid, ignore
                          }
                        }

                        return {
                          container: {
                            backgroundColor: isPressed ? '#E5E7EB' : '#FFFFFF',
                            opacity: isDisabled ? 0.4 : 1,
                          },
                          content: {
                            color: isDisabled ? '#D1D5DB' : '#111827',
                          },
                        };
                      },
                      active: () => ({
                        container: {
                          backgroundColor: '#3B82F6',
                        },
                        content: {
                          color: '#FFFFFF',
                        },
                      }),
                      today: () => ({
                        container: {
                          borderWidth: 1,
                          borderColor: '#3B82F6',
                        },
                        content: {
                          color: '#111827',
                        },
                      }),
                      disabled: () => ({
                        container: {
                          backgroundColor: '#F9FAFB',
                        },
                        content: {
                          color: '#D1D5DB',
                        },
                      }),
                    },
                  }}
                />
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={handleCancel}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg py-3 items-center"
                  >
                    <Text className="text-base font-medium text-gray-700 dark:text-gray-300">Cancel</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="bg-blue-600 rounded-lg py-3 items-center"
                  >
                    <Text className="text-base font-medium text-white">Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
});

