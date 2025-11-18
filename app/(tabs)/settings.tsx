import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Card } from "@/components/ui/card";
import { REMINDER_TIMES, requestNotificationPermissions } from "@/services/notifications";
import { useNotificationStore } from "@/store/notification-store";
import { useSettingsStore } from "@/store/settings-store";
import { getCurrencyOptions, getCurrencySymbol } from "@/utils/currencies";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Switch, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function SettingsScreen() {
  const { preferences, loadPreferences, updateReminderSettings, isLoading } =
    useNotificationStore();
  const { settings, loadSettings, updateIncomeCalculationEnabled, updateCurrency } = useSettingsStore();
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadSettings();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
  };

  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled && !permissionGranted) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive reminders."
        );
        return;
      }
      setPermissionGranted(true);
    }

    await updateReminderSettings(enabled, preferences.reminder.frequency);
  };

  const handleFrequencyChange = async (value: string | number) => {
    const frequency = value as 1 | 2 | 3 | 4;
    await updateReminderSettings(preferences.reminder.enabled, frequency);
  };

  const frequencyOptions = [
    { label: "1 time per day", value: 1 },
    { label: "2 times per day", value: 2 },
    { label: "3 times per day", value: 3 },
    { label: "4 times per day", value: 4 },
  ];

  const getTimeLabels = (frequency: 1 | 2 | 3 | 4) => {
    return REMINDER_TIMES[frequency].map((time) => time.label).join(", ");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Settings
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Manage your app preferences
            </Text>
          </View>
            {/* Notification Settings */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Notification Settings
              </Text>

              {/* Reminder Toggle */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Daily Reminder
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Get reminders to log your expenses
                    </Text>
                  </View>
                  <Switch
                    value={preferences.reminder.enabled}
                    onValueChange={handleReminderToggle}
                    trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Frequency Selection */}
              {preferences.reminder.enabled && (
                <View className="mb-4">
                  <BottomSheetSelect
                    label="Reminder Frequency"
                    options={frequencyOptions}
                    value={preferences.reminder.frequency}
                    onValueChange={handleFrequencyChange}
                    placeholder="Select frequency"
                  />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Times: {getTimeLabels(preferences.reminder.frequency)}
                  </Text>
                </View>
              )}

              {!permissionGranted && (
                <View className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Text className="text-sm text-yellow-800 dark:text-yellow-200">
                    Notifications are disabled. Please enable them in your device settings.
                  </Text>
                </View>
              )}
            </Card>

            {/* Income Calculation Settings */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Transaction Settings
              </Text>

              {/* Currency Selector */}
              <View className="mb-4">
                <BottomSheetSelect
                  label="Currency"
                  options={getCurrencyOptions()}
                  value={settings.currency}
                  onValueChange={updateCurrency}
                />
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current symbol: {getCurrencySymbol(settings.currency)}
                </Text>
              </View>

              {/* Income Calculation Toggle */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Enable Income Calculation
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Track and calculate income along with expenses
                    </Text>
                  </View>
                  <Switch
                    value={settings.incomeCalculationEnabled}
                    onValueChange={updateIncomeCalculationEnabled}
                    trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {!settings.incomeCalculationEnabled && (
                  <View className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Text className="text-sm text-blue-800 dark:text-blue-200">
                      Income tracking is disabled. Only expenses will be tracked and displayed.
                    </Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Data Management */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Data Management
              </Text>

              {/* Manage Categories */}
              <TouchableOpacity
                onPress={() => router.push('/settings/categories')}
                className="flex-row items-center justify-between py-3 mb-3"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2">
                    <Ionicons name="apps" size={20} color="#9333EA" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Manage Categories
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Add, edit, or delete categories
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Manage Tags */}
              <TouchableOpacity
                onPress={() => router.push('/settings/tags')}
                className="flex-row items-center justify-between py-3"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                    <Ionicons name="pricetag" size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Manage Tags
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Add, edit, or delete tags
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

