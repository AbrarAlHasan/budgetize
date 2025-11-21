import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Card } from "@/components/ui/card";
import {
  REMINDER_TIMES,
  requestNotificationPermissions,
} from "@/services/notifications";
import { onboardingStorage } from "@/storage/onboarding";
import { useNotificationStore } from "@/store/notification-store";
import { useSettingsStore } from "@/store/settings-store";
import { backupAppData, restoreAppData } from "@/utils/backup";
import { getCurrencyOptions, getCurrencySymbol } from "@/utils/currencies";
import { resetAppWithDummyData } from "@/utils/dummy-data";
import { Ionicons } from "@expo/vector-icons";
import { Paths } from "expo-file-system";
import { router } from "expo-router";
import { colorScheme } from "nativewind";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { preferences, loadPreferences, updateReminderSettings, isLoading } =
    useNotificationStore();
  const {
    settings,
    loadSettings,
    updateIncomeCalculationEnabled,
    updateCurrency,
    updateTheme,
  } = useSettingsStore();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSeedingDummyData, setIsSeedingDummyData] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    console.log(Paths.document.uri);
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

  const themeOptions = [
    { label: "Light Mode", value: "light" },
    { label: "Dark Mode", value: "dark" },
    { label: "System Default", value: "auto" },
  ];

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "light":
        return "sunny";
      case "dark":
        return "moon";
      case "auto":
        return "phone-portrait";
      default:
        return "phone-portrait";
    }
  };

  const getTimeLabels = (frequency: 1 | 2 | 3 | 4) => {
    return REMINDER_TIMES[frequency].map((time) => time.label).join(", ");
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      "Reset Onboarding",
      "This will reset the onboarding screens. You'll need to restart the app to see them again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            onboardingStorage.reset();
            Alert.alert(
              "Success!",
              "Onboarding has been reset. Please close and restart the app to see the onboarding screens again.",
              [{ text: "OK" }]
            );
          },
        },
      ]
    );
  };

  const runDummyDataSeed = async () => {
    try {
      setIsSeedingDummyData(true);
      const summary = await resetAppWithDummyData();
      Alert.alert(
        "Dummy Data Ready",
        `Generated ${summary.transactions} transactions across ${summary.accounts} accounts.\nPull to refresh to see the latest data.`
      );
    } catch (error) {
      console.error("Failed to seed dummy data:", error);
      Alert.alert(
        "Seeding Failed",
        "Could not generate dummy data. Check the Metro logs for more details."
      );
    } finally {
      setIsSeedingDummyData(false);
    }
  };

  const handleSeedDummyData = () => {
    if (isSeedingDummyData) {
      return;
    }

    Alert.alert(
      "Replace Data with Dummy Set?",
      "This will erase all existing accounts, categories, tags, and transactions, then seed one year of dummy data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Do it",
          style: "destructive",
          onPress: runDummyDataSeed,
        },
      ]
    );
  };

  const handleBackupData = async () => {
    if (isBackingUp) {
      return;
    }

    try {
      setIsBackingUp(true);
      const zipPath = await backupAppData();
      if (zipPath) {
        Alert.alert(
          "Backup Ready",
          "backup.zip was generated and the system share dialog opened. Save it to a safe location."
        );
      } else {
        Alert.alert(
          "Backup Failed",
          "Could not create the backup. Please try again."
        );
      }
    } catch (error) {
      console.error("Backup failed:", error);
      Alert.alert(
        "Backup Failed",
        "An unexpected error occurred while creating the backup."
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  const runRestoreData = async () => {
    try {
      setIsRestoring(true);
      const success = await restoreAppData();
      if (success) {
        // Reload settings and preferences after restore
        await loadSettings();
        await loadPreferences();

        Alert.alert(
          "Restore Complete",
          "Your data has been successfully restored. The app will now use the restored data.",
          [
            {
              text: "OK",
              onPress: () => {
                // Optionally refresh the app or navigate
                // You might want to reload queries or restart the app
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Restore Failed",
          "Could not restore the backup. Please make sure you selected a valid backup file and try again."
        );
      }
    } catch (error) {
      console.error("Restore failed:", error);
      Alert.alert(
        "Restore Failed",
        "An unexpected error occurred while restoring the backup."
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreData = () => {
    if (isRestoring) {
      return;
    }

    Alert.alert(
      "Import & Restore Data",
      "This will replace all existing data (accounts, transactions, categories, tags, and settings) with the data from the backup file. This action cannot be undone.\n\nMake sure you have a recent backup before proceeding.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: runRestoreData,
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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

          {/* Appearance Settings */}
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Appearance
            </Text>

            {/* Theme Selection */}
            <View className="mb-2">
              <BottomSheetSelect
                label="Theme"
                options={themeOptions}
                value={settings.theme}
                onValueChange={async (value) => {
                  const theme = value as "light" | "dark" | "auto";
                  await updateTheme(theme);

                  // Update NativeWind colorScheme
                  // For 'auto', use 'system' to follow device preference
                  if (theme !== "auto") {
                    colorScheme.set(theme);
                  } else {
                    // Reset to system preference
                    colorScheme.set("system");
                  }
                }}
                placeholder="Select theme"
              />
              <View className="flex-row items-center mt-2">
                <Ionicons
                  name={getThemeIcon(settings.theme) as any}
                  size={16}
                  color="#6B7280"
                />
                <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {settings.theme === "auto"
                    ? "Follows your system preference"
                    : settings.theme === "light"
                    ? "Light theme enabled"
                    : "Dark theme enabled"}
                </Text>
              </View>
            </View>
          </Card>
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
                  Notifications are disabled. Please enable them in your device
                  settings.
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
                onValueChange={(value) => updateCurrency(value as string)}
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
                    Income tracking is disabled. Only expenses will be tracked
                    and displayed.
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

            {/* Backup Data */}
            <TouchableOpacity
              onPress={handleBackupData}
              className="flex-row items-center justify-between py-3 mb-3"
              activeOpacity={0.7}
              disabled={isBackingUp}
              style={{ opacity: isBackingUp ? 0.6 : 1 }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                  <Ionicons name="cloud-upload" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Backup & Export Data
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Creates an encrypted ZIP (SQLite, MMKV, metadata) and opens
                    sharing
                  </Text>
                  {isBackingUp && (
                    <Text className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Preparing backup...
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Import & Restore Data */}
            <TouchableOpacity
              onPress={handleRestoreData}
              className="flex-row items-center justify-between py-3 mb-3"
              activeOpacity={0.7}
              disabled={isRestoring}
              style={{ opacity: isRestoring ? 0.6 : 1 }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-2">
                  <Ionicons name="cloud-download" size={20} color="#F97316" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Import & Restore Data
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Restore from a backup file (replaces all existing data)
                  </Text>
                  {isRestoring && (
                    <Text className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Restoring data...
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Manage Categories */}
            <TouchableOpacity
              onPress={() => router.push("/settings/categories")}
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
              onPress={() => router.push("/settings/tags")}
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

          {/* Developer Options */}
          {true && (
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Developer Options
              </Text>

              {/* Reset Onboarding */}
              <TouchableOpacity
                onPress={handleResetOnboarding}
                className="flex-row items-center justify-between py-3 mb-2"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-2">
                    <Ionicons name="refresh" size={20} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Reset Onboarding
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Show welcome screens again
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Seed Dummy Data */}
              <TouchableOpacity
                onPress={handleSeedDummyData}
                className="flex-row items-center justify-between py-3"
                activeOpacity={0.7}
                disabled={isSeedingDummyData}
                style={{ opacity: isSeedingDummyData ? 0.6 : 1 }}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-red-100 dark:bg-red-900/30 rounded-full p-2">
                    <Ionicons name="cloud-download" size={20} color="#DC2626" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Load Dummy Data
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Clears DB and injects 12 months of sample data
                    </Text>
                    {isSeedingDummyData && (
                      <Text className="text-xs text-red-500 mt-1">
                        Seeding dummy data...
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
