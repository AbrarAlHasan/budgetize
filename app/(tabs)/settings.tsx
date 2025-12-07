import { BackupList } from "@/components/cloud-backup/backup-list";
import { LoginButton } from "@/components/cloud-backup/login-button";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Card } from "@/components/ui/card";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import { useInAppUpdates } from "@/hooks/use-in-app-updates";
import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  REMINDER_TIMES,
  requestNotificationPermissions,
} from "@/services/notifications";
import { onboardingStorage } from "@/storage/onboarding";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { useSettingsStore } from "@/store/settings-store";
import { createBackupFile, restoreAppData } from "@/utils/backup";
import { clearDatabase } from "@/utils/clear-database";
import { uploadBackupToCloud } from "@/utils/cloud-backup";
import {
  enableAutomaticBackups,
  disableAutomaticBackups,
  isAutomaticBackupEnabled,
  getLastBackupTimestamp,
} from "@/services/background-backup";
import { getCurrencyOptions, getCurrencySymbol } from "@/utils/currencies";
import { resetAppWithDummyData } from "@/utils/dummy-data";
import { log, logError } from "@/utils/logger";
import { openSupportEmail } from "@/utils/support";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Paths } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { colorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ focusAccount?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const { alert } = useCustomAlert();
  const { preferences, loadPreferences, updateReminderSettings, isLoading } =
    useNotificationStore();
  const {
    settings,
    loadSettings,
    updateIncomeCalculationEnabled,
    updateCurrency,
    updateTheme,
    updateExchangeEnabled,
  } = useSettingsStore();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuthStore();
  const { checkAndPromptUpdate } = useInAppUpdates({ autoCheck: false });
  const { isNetworkAvailable } = useNetworkStatus();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSeedingDummyData, setIsSeedingDummyData] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearingDatabase, setIsClearingDatabase] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [backupListRefreshTrigger, setBackupListRefreshTrigger] = useState(0);
  const [automaticBackupEnabled, setAutomaticBackupEnabled] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [settingsTapCount, setSettingsTapCount] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dummyDataProgress, setDummyDataProgress] = useState(0);

  useEffect(() => {
    log(Paths.document.uri);
    loadPreferences();
    loadSettings();
    checkPermissions();
    loadAutomaticBackupStatus();
    // Auth initialization is handled in background in app/_layout.tsx
  }, []);

  const loadAutomaticBackupStatus = async () => {
    const enabled = await isAutomaticBackupEnabled();
    const lastBackup = await getLastBackupTimestamp();
    setAutomaticBackupEnabled(enabled);
    setLastBackupTime(lastBackup);
  };

  const handleAutomaticBackupToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        // Request notification permissions if not already granted
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          alert('Permission Required', 'Notification permission is required for automatic backups. Please enable it in Settings.');
          return;
        }

        const success = await enableAutomaticBackups();
        if (success) {
          setAutomaticBackupEnabled(true);
          alert('Success', 'Automatic backups enabled. Your data will be backed up daily at 10 PM.');
        } else {
          alert('Error', 'Failed to enable automatic backups. Please try again.');
        }
      } else {
        await disableAutomaticBackups();
        setAutomaticBackupEnabled(false);
        alert('Success', 'Automatic backups disabled.');
      }
    } catch (error) {
      logError('Error toggling automatic backups:', error);
      alert('Error', 'Failed to update automatic backup settings.');
    }
  };

  // Scroll to account section when focusAccount parameter is present
  const [accountSectionY, setAccountSectionY] = useState<number | null>(null);

  useEffect(() => {
    if (params.focusAccount === "true" && accountSectionY !== null && scrollViewRef.current) {
      // Wait for layout to complete before scrolling
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: accountSectionY - 20, // Add some padding at the top
          animated: true,
        });
      }, 300);
    }
  }, [params.focusAccount, accountSectionY]);

  const checkPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
  };

  const handleReminderToggle = async (enabled: boolean) => {
    if (enabled && !permissionGranted) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        alert(
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

  const handleSettingsHeaderTap = () => {
    // Clear existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    const newCount = settingsTapCount + 1;
    setSettingsTapCount(newCount);

    // If 5 taps reached, show developer options
    if (newCount >= 5) {
      setShowDeveloperOptions(true);
      setSettingsTapCount(0);
    } else {
      // Reset counter after 2 seconds of no taps
      tapTimeoutRef.current = setTimeout(() => {
        setSettingsTapCount(0);
      }, 2000);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

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
    alert(
      "Reset Onboarding",
      "This will reset the onboarding screens. You'll need to restart the app to see them again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            onboardingStorage.reset();
            alert(
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
      setDummyDataProgress(0);
      const summary = await resetAppWithDummyData((progress) => {
        setDummyDataProgress(progress);
      });
      setDummyDataProgress(100);
      alert(
        "Dummy Data Ready",
        `Generated ${summary.transactions} transactions across ${summary.accounts} accounts.\nPull to refresh to see the latest data.`
      );
    } catch (error) {
      logError("Failed to seed dummy data:", error);
      alert(
        "Seeding Failed",
        "Could not generate dummy data. Check the Metro logs for more details."
      );
    } finally {
      setIsSeedingDummyData(false);
      setDummyDataProgress(0);
    }
  };

  const handleSeedDummyData = () => {
    if (isSeedingDummyData) {
      return;
    }

    alert(
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
      // 1. Create the backup file
      const zipPath = await createBackupFile();
      if (!zipPath) {
        alert(
          "Backup Failed",
          "Could not create the backup. Please try again."
        );
        return;
      }

      // 2. Open the share dialog
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(zipPath);
          alert(
            "Backup Ready",
            "Backup file created and share dialog opened. Save it to a safe location."
          );
        } else {
          alert(
            "Backup Created",
            `Backup file created at: ${zipPath}\nSharing is not available on this platform.`
          );
        }
      } catch (shareError) {
        logError("Share error:", shareError);
        alert(
          "Backup Created",
          `Backup file created at: ${zipPath}\nFailed to open share dialog.`
        );
      }
    } catch (error) {
      logError("Backup failed:", error);
      alert(
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

        alert(
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
        alert(
          "Restore Failed",
          "Could not restore the backup. Please make sure you selected a valid backup file and try again."
        );
      }
    } catch (error) {
      logError("Restore failed:", error);
      alert(
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

    alert(
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

  const runClearDatabase = async () => {
    try {
      setIsClearingDatabase(true);
      await clearDatabase();
      
      // Invalidate all queries to refresh the UI
      await queryClient.invalidateQueries();
      
      alert(
        "Database Cleared",
        "All data has been successfully cleared from the database.",
        [{ text: "OK" }]
      );
    } catch (error) {
      logError("Failed to clear database:", error);
      alert(
        "Clear Failed",
        "An error occurred while clearing the database. Please try again."
      );
    } finally {
      setIsClearingDatabase(false);
    }
  };

  const handleClearDatabase = () => {
    if (isClearingDatabase) {
      return;
    }

    alert(
      "Clear All Data",
      "This will permanently delete ALL data from the database:\n\n• All accounts\n• All transactions\n• All categories\n• All tags\n\nThis action CANNOT be undone. Make sure you have a backup if you want to restore this data later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All Data",
          style: "destructive",
          onPress: runClearDatabase,
        },
      ]
    );
  };

  const handleCheckForUpdates = async () => {
    if (isCheckingForUpdates) {
      return;
    }

    setIsCheckingForUpdates(true);
    try {
      // Pass true to show message even if no update is available
      await checkAndPromptUpdate(true);
    } catch (error) {
      logError("Failed to check for updates:", error);
    } finally {
      setIsCheckingForUpdates(false);
    }
  };

  const handleOpenSupport = async () => {
    try {
      await openSupportEmail();
    } catch (error) {
      logError("Failed to open support email:", error);
      alert(
        "Unable to Open Email",
        "Please make sure you have an email app installed and configured on your device."
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={["top"]}>
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1" 
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-6 pb-6">
          {/* Header */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={handleSettingsHeaderTap}
              activeOpacity={1}
            >
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                Settings
              </Text>
            </TouchableOpacity>
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

            {/* Exchange Feature Toggle */}
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Ionicons name="swap-horizontal" size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Exchange Feature
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-7">
                    Track money lent and borrowed
                  </Text>
                </View>
                <Switch
                  onValueChange={updateExchangeEnabled}
                  value={settings.exchangeEnabled}
                  trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                  thumbColor="#FFFFFF"
                />
              </View>
              {settings.exchangeEnabled && (
                <View className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-row items-start">
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
                  <Text className="text-sm text-green-800 dark:text-green-200 flex-1">
                    Exchange feature is enabled. You can now track money you've lent to others or borrowed from others.
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
              className="flex-row items-center justify-between py-3 mb-3"
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

            {/* Clear Database */}
            <TouchableOpacity
              onPress={handleClearDatabase}
              className="flex-row items-center justify-between py-3"
              activeOpacity={0.7}
              disabled={isClearingDatabase}
              style={{ opacity: isClearingDatabase ? 0.6 : 1 }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="bg-red-100 dark:bg-red-900/30 rounded-full p-2">
                  <Ionicons name="trash" size={20} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Clear All Data
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Permanently delete all accounts, transactions, categories, and tags
                  </Text>
                  {isClearingDatabase && (
                    <Text className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Clearing database...
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>

          {/* Account Section */}
          <Card 
            className="mb-4" 
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              setAccountSectionY(y);
            }}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Account
            </Text>

            {!isNetworkAvailable ? (
              <View>
                <View className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
                  <View className="flex-row items-start gap-3">
                    <Ionicons name="cloud-offline" size={20} color="#F59E0B" />
                    <Text className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">
                      Network is not available. Session check will be performed when network becomes available.
                    </Text>
                  </View>
                </View>
                {isAuthenticated && (
                  <View className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                    <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Logged in as {user?.email || 'User'} (session cached)
                    </Text>
                  </View>
                )}
                {!isAuthenticated && (
                  <View>
                    <LoginButton />
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                      Login to enable cloud backup features (requires network)
                    </Text>
                  </View>
                )}
              </View>
            ) : authLoading ? (
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  Checking session...
                </Text>
              </View>
            ) : !isAuthenticated ? (
              <View>
                <LoginButton />
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                  Login to enable cloud backup features
                </Text>
              </View>
            ) : (
              <View>
                <View className="flex-row items-center justify-between mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <View className="flex-row items-center gap-3 flex-1">
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Logged in as {user?.email || 'User'}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Cloud backup is enabled
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    const { error } = await logout();
                    if (error) {
                      alert('Error', 'Failed to logout. Please try again.');
                    }
                  }}
                  className="flex-row items-center justify-center bg-red-600 dark:bg-red-500 px-6 py-3 rounded-xl"
                >
                  <Ionicons name="log-out" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text className="text-white font-semibold text-base">Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Cloud Backup Section */}
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Cloud Backup
            </Text>

            {/* If network is not available, show disabled state */}
            {!isNetworkAvailable ? (
              <View>
                <View className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
                  <View className="flex-row items-start gap-3">
                    <Ionicons name="cloud-offline" size={20} color="#EF4444" />
                    <Text className="text-sm text-red-800 dark:text-red-200 flex-1">
                      Network is not available. Cloud backup requires an active internet connection. Please check your network connection.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  disabled={true}
                  className="flex-row items-center justify-between py-3 mb-3 opacity-50"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                      <Ionicons name="cloud-upload" size={20} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Upload Backup to Cloud
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Automatically backup to cloud (keeps latest 3 backups)
                      </Text>
                      <Text className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Network not available
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                <View className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Cloud backup features disabled - Network required
                  </Text>
                </View>
              </View>
            ) : authLoading ? (
              /* Show loading state while checking session */
              <View className="flex-row items-center justify-center py-4">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  Checking session...
                </Text>
              </View>
            ) : !isAuthenticated ? (
              /* Network available but not authenticated - show login */
              <View>
                <View className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-4">
                  <View className="flex-row items-start gap-3">
                    <Ionicons name="warning" size={20} color="#F59E0B" />
                    <Text className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">
                      To use cloud backup, please login with your Google account. This allows you to automatically backup your data to the cloud and restore from any of your latest 3 backups.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  disabled={true}
                  className="flex-row items-center justify-between py-3 mb-3 opacity-50"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                      <Ionicons name="cloud-upload" size={20} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Upload Backup to Cloud
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Automatically backup to cloud (keeps latest 3 backups)
                      </Text>
                      <Text className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Session not available - Please login
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : (
              /* Network available and authenticated - enable cloud backup */
              <View>
                <TouchableOpacity
                  onPress={async () => {
                    if (!user?.id) {
                      alert('Error', 'User ID not found. Please login again.');
                      return;
                    }

                    setIsUploadingToCloud(true);
                    try {
                      const { error, success } = await uploadBackupToCloud(user.id);
                      if (error || !success) {
                        alert('Error', 'Failed to upload backup to cloud. Please try again.');
                        return;
                      }
                      alert('Success', 'Backup uploaded to cloud successfully!');
                      // Trigger backup list refresh
                      setBackupListRefreshTrigger(prev => prev + 1);
                    } catch (error) {
                      logError('Error uploading to cloud:', error);
                      alert('Error', 'An unexpected error occurred.');
                    } finally {
                      setIsUploadingToCloud(false);
                    }
                  }}
                  className="flex-row items-center justify-between py-3 mb-4"
                  activeOpacity={0.7}
                  disabled={isUploadingToCloud}
                  style={{ opacity: isUploadingToCloud ? 0.6 : 1 }}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                      {isUploadingToCloud ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <Ionicons name="cloud-upload" size={20} color="#3B82F6" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Upload Backup to Cloud
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Automatically backup to cloud (keeps latest 3 backups)
                      </Text>
                      {isUploadingToCloud && (
                        <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Uploading backup...
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Automatic Backup Toggle */}
                <View className="flex-row items-center justify-between py-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                  <View className="flex-1 mr-4">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Ionicons name="time" size={16} color="#6B7280" />
                      <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Automatic Daily Backup
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Automatically backup your data every day at 10 PM
                    </Text>
                    {lastBackupTime && (
                      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Last backup: {new Date(lastBackupTime).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={automaticBackupEnabled}
                    onValueChange={handleAutomaticBackupToggle}
                    trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#D1D5DB"
                  />
                </View>

                <View className="mt-2">
                  {user?.id && (
                    <BackupList userId={user.id} refreshTrigger={backupListRefreshTrigger} />
                  )}
                </View>
              </View>
            )}
          </Card>

          {/* Developer Options */}
          {showDeveloperOptions && (
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
                      <View className="mt-3">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-xs text-gray-600 dark:text-gray-400">
                            Generating data...
                          </Text>
                          <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {dummyDataProgress}%
                          </Text>
                        </View>
                        <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${dummyDataProgress}%` }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </Card>
          )}

          {/* App Updates */}
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              App Updates
            </Text>

            <TouchableOpacity
              onPress={handleCheckForUpdates}
              className="flex-row items-center justify-between py-3"
              activeOpacity={0.7}
              disabled={isCheckingForUpdates}
              style={{ opacity: isCheckingForUpdates ? 0.6 : 1 }}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                  {isCheckingForUpdates ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Ionicons name="refresh" size={20} color="#3B82F6" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Check for Updates
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {isCheckingForUpdates
                      ? "Checking for updates..."
                      : "Check if a new version is available"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>

          {/* Support */}
          <Card className="mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Support
            </Text>

            <TouchableOpacity
              onPress={handleOpenSupport}
              className="flex-row items-center justify-between py-3"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="bg-indigo-100 dark:bg-indigo-900/30 rounded-full p-2">
                  <Ionicons name="mail" size={20} color="#6366F1" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                    Contact Support
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Send us an email with your device information
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </Card>

          {/* Version Number */}
          <View className="items-center py-6">
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              Version {Constants.expoConfig?.version || "1.0.0"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
