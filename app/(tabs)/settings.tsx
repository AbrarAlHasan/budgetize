import {
    BankSelectionBottomSheet,
    BankSelectionBottomSheetRef,
    SupportedBank,
} from "@/components/bank-selection-bottom-sheet";
import { BackupList } from "@/components/cloud-backup/backup-list";
import { LoginButton } from "@/components/cloud-backup/login-button";
import { DateRangePickerModal } from "@/components/date-range-picker-modal";
import {
    DummyDataSize,
    DummyDataSizeBottomSheet,
    DummyDataSizeBottomSheetRef,
} from "@/components/dummy-data-size-bottom-sheet";
import { PinScreen } from "@/components/security/pin-screen";
import { TagChip } from "@/components/tag-chip";
import {
    BottomSheetMultiSelect,
    BottomSheetMultiSelectRef,
} from "@/components/ui/bottom-sheet-multi-select";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Card } from "@/components/ui/card";
import { useTags } from "@/hooks/queries/use-tags";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import { useInAppUpdates } from "@/hooks/use-in-app-updates";
import { useMarkInteractive } from "@/hooks/use-mark-interactive";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { getCloudBackupBackgroundAvailability } from "@/services/cloud-backup-background-availability";
import {
    registerCloudBackupBackgroundTask,
    unregisterCloudBackupBackgroundTask,
} from "@/services/cloud-backup-background-registration";
import {
    REMINDER_TIMES,
    requestNotificationPermissions,
} from "@/services/notifications";
import { cloudBackupScheduleStorage } from "@/storage/cloud-backup-schedule";
import { onboardingStorage } from "@/storage/onboarding";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { useSecurityStore } from "@/store/security-store";
import { useSettingsStore } from "@/store/settings-store";
import { reportAutoBackupError } from "@/utils/auto-backup-sentry";
import { createBackupFile, restoreAppData } from "@/utils/backup";
import { clearDatabase } from "@/utils/clear-database";
import { uploadBackupToCloud } from "@/utils/cloud-backup";
import {
    formatLastBackupLabel,
    formatLocalDateKey,
    isWithinDailyBackupWindow,
} from "@/utils/cloud-backup-schedule";
import { getCurrencyOptions, getCurrencySymbol } from "@/utils/currencies";
import { resetAppWithDummyData } from "@/utils/dummy-data";
import { exportAndShareTransactionsToExcel } from "@/utils/excel-export";
import { log, logError } from "@/utils/logger";
import { openSupportEmail } from "@/utils/support";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import { Paths } from "expo-file-system";
import * as LocalAuthentication from "expo-local-authentication";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import * as Sharing from "expo-sharing";
import { colorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
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
  useMarkInteractive();
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
    updateDefaultTagIds,
  } = useSettingsStore();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    logout,
  } = useAuthStore();
  const { checkAndPromptUpdate } = useInAppUpdates({ autoCheck: false });
  const { isNetworkAvailable } = useNetworkStatus();
  const { data: tags } = useTags();
  const defaultTagSelectorRef = useRef<BottomSheetMultiSelectRef>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSeedingDummyData, setIsSeedingDummyData] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isClearingDatabase, setIsClearingDatabase] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [autoCloudBackupEnabled, setAutoCloudBackupEnabled] = useState(() =>
    cloudBackupScheduleStorage.isAutoBackupEnabled(),
  );
  const [lastAutoCloudBackupDate, setLastAutoCloudBackupDate] = useState<
    string | null
  >(() => cloudBackupScheduleStorage.getLastBackupDate());
  const [backgroundBackupWarning, setBackgroundBackupWarning] = useState<
    string | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      setAutoCloudBackupEnabled(
        cloudBackupScheduleStorage.isAutoBackupEnabled(),
      );
      setLastAutoCloudBackupDate(
        cloudBackupScheduleStorage.getLastBackupDate(),
      );

      if (!isAuthenticated) {
        setBackgroundBackupWarning(null);
        return;
      }

      getCloudBackupBackgroundAvailability()
        .then((availability) => {
          setBackgroundBackupWarning(
            availability.available ? null : (availability.message ?? null),
          );
        })
        .catch(() => {
          setBackgroundBackupWarning(null);
        });
    }, [isAuthenticated]),
  );
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [backupListRefreshTrigger, setBackupListRefreshTrigger] = useState(0);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);
  const [settingsTapCount, setSettingsTapCount] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dummyDataProgress, setDummyDataProgress] = useState(0);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isImportingBankStatement, setIsImportingBankStatement] =
    useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [showChangePinVerify, setShowChangePinVerify] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const dummyDataSizeBottomSheetRef = useRef<DummyDataSizeBottomSheetRef>(null);
  const bankSelectionBottomSheetRef = useRef<BankSelectionBottomSheetRef>(null);
  const {
    isLockEnabled,
    isBiometricEnabled,
    setIsLockEnabled,
    setAuthenticated,
    reset: resetSecurity,
  } = useSecurityStore();

  useEffect(() => {
    log(Paths.document.uri);
    loadPreferences();
    loadSettings();
    checkPermissions();
    // Auth initialization is handled in background in app/_layout.tsx
  }, []);

  // Scroll to account section when focusAccount parameter is present
  const [accountSectionY, setAccountSectionY] = useState<number | null>(null);

  useEffect(() => {
    if (
      params.focusAccount === "true" &&
      accountSectionY !== null &&
      scrollViewRef.current
    ) {
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
          "Please enable notifications in your device settings to receive reminders.",
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
              [{ text: "OK" }],
            );
          },
        },
      ],
    );
  };

  const runDummyDataSeed = async (size: DummyDataSize) => {
    try {
      setIsSeedingDummyData(true);
      setDummyDataProgress(0);

      // Define options based on size
      let options;
      switch (size) {
        case "small":
          options = { months: 3, transactionsPerDay: 10 };
          break;
        case "medium":
          options = { months: 6, transactionsPerDay: 15 };
          break;
        case "large":
          options = { months: 24, transactionsPerDay: 50 };
          break;
      }

      const summary = await resetAppWithDummyData(options, (progress) => {
        setDummyDataProgress(progress);
      });
      setDummyDataProgress(100);
      alert(
        "Dummy Data Ready",
        `Generated ${summary.transactions} transactions across ${summary.accounts} accounts.\nPull to refresh to see the latest data.`,
      );
    } catch (error) {
      logError("Failed to seed dummy data:", error);
      alert(
        "Seeding Failed",
        "Could not generate dummy data. Check the Metro logs for more details.",
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

    // Show confirmation alert first
    alert(
      "Replace Data with Dummy Set?",
      "This will erase all existing accounts, categories, tags, and transactions, then seed dummy data based on your selection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "default",
          onPress: () => {
            dummyDataSizeBottomSheetRef.current?.present();
          },
        },
      ],
    );
  };

  const handleDummyDataSizeSelect = (size: DummyDataSize) => {
    runDummyDataSeed(size);
  };

  const handleBackupData = async () => {
    if (isBackingUp) {
      return;
    }

    try {
      setIsBackingUp(true);
      // 1. Create the backup file
      const { path: zipPath, error: backupError } = await createBackupFile();
      if (!zipPath) {
        alert(
          "Backup Failed",
          backupError?.message ??
            "Could not create the backup. Please try again.",
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
            "Backup file created and share dialog opened. Save it to a safe location.",
          );
        } else {
          alert(
            "Backup Created",
            `Backup file created at: ${zipPath}\nSharing is not available on this platform.`,
          );
        }
      } catch (shareError) {
        logError("Share error:", shareError);
        alert(
          "Backup Created",
          `Backup file created at: ${zipPath}\nFailed to open share dialog.`,
        );
      }
    } catch (error) {
      logError("Backup failed:", error);
      alert(
        "Backup Failed",
        "An unexpected error occurred while creating the backup.",
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
        alert("Restore Complete", "Your data has been successfully restored.", [
          {
            text: "OK",
            onPress: () => router.replace("/(tabs)"),
          },
        ]);
      } else {
        alert(
          "Restore Failed",
          "Could not restore the backup. Please make sure you selected a valid backup file and try again.",
        );
      }
    } catch (error) {
      logError("Restore failed:", error);
      alert(
        "Restore Failed",
        "An unexpected error occurred while restoring the backup.",
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
      ],
    );
  };

  const handleImportBankStatement = () => {
    if (isImportingBankStatement) return;
    // Show bank selection bottom sheet
    bankSelectionBottomSheetRef.current?.present();
  };

  const handleBankSelected = async (bank: SupportedBank) => {
    try {
      setIsImportingBankStatement(true);

      // Pick Excel/CSV file using DocumentPicker
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-excel", // .xls
          "text/csv", // .csv
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; // User cancelled
      }

      const file = result.assets[0];
      if (!file.uri) {
        alert("Error", "Failed to get file URI. Please try again.");
        return;
      }

      // Navigate to review screen with bank and file URI
      router.push({
        pathname: "/settings/bank-import",
        params: { fileUri: file.uri, bank },
      });
    } catch (error) {
      logError("Failed to pick bank statement file:", error);
      alert("Error", "Failed to select file. Please try again.");
    } finally {
      setIsImportingBankStatement(false);
    }
  };

  const handleExcelExport = async (startDate: string, endDate: string) => {
    if (isExportingExcel) {
      return;
    }

    try {
      setIsExportingExcel(true);
      setShowExcelExportModal(false);

      const success = await exportAndShareTransactionsToExcel({
        startDate,
        endDate,
      });

      if (success) {
        alert(
          "Export Complete",
          "Your transactions have been exported to Excel and the share dialog has been opened.",
        );
      } else {
        alert(
          "Export Failed",
          "Could not export transactions. Please make sure you have transactions in the selected date range and try again.",
        );
      }
    } catch (error) {
      logError("Excel export failed:", error);
      alert(
        "Export Failed",
        "An unexpected error occurred while exporting to Excel.",
      );
    } finally {
      setIsExportingExcel(false);
    }
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
        [{ text: "OK" }],
      );
    } catch (error) {
      logError("Failed to clear database:", error);
      alert(
        "Clear Failed",
        "An error occurred while clearing the database. Please try again.",
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
      ],
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
        "Please make sure you have an email app installed and configured on your device.",
      );
    }
  };

  // Handle PIN setup completion
  const handlePinSetupComplete = async () => {
    setShowPinSetup(false);

    if (isChangingPin) {
      // Changing PIN - just show success message
      setIsChangingPin(false);
      alert("PIN Changed", "Your PIN has been changed successfully.", [
        { text: "OK" },
      ]);
    } else {
      // First time setup - enable lock and biometric
      await setIsLockEnabled(true);

      // Set authenticated to true so user can continue using the app immediately
      // Authentication will be reset when app goes to background, requiring PIN on next open
      setAuthenticated(true);

      // Automatically enable biometric if available
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const { setIsBiometricEnabled } = useSecurityStore.getState();
          setIsBiometricEnabled(true);
        }
      } catch (error) {
        // Biometric not available or error - continue without it
        logError("Biometric setup error:", error);
      }

      alert(
        "Security Enabled",
        "App lock has been enabled successfully. Your app will now require authentication when you reopen it.",
        [{ text: "OK" }],
      );
    }
  };

  const handlePinSetupCancel = () => {
    setShowPinSetup(false);
    setIsChangingPin(false);
  };

  const handlePinVerifySuccess = async () => {
    setShowPinVerify(false);
    await setIsLockEnabled(false);
    alert("App Lock Disabled", "App lock has been disabled successfully.", [
      { text: "OK" },
    ]);
  };

  const handlePinVerifyCancel = () => {
    setShowPinVerify(false);
  };

  const handleChangePinVerifySuccess = () => {
    setShowChangePinVerify(false);
    setIsChangingPin(true);
    // Delay to ensure verification modal closes before setup modal opens
    setTimeout(() => {
      setShowPinSetup(true);
    }, 300);
  };

  const handleChangePinVerifyCancel = () => {
    setShowChangePinVerify(false);
    setIsChangingPin(false);
  };

  return (
    <>
      {/* PIN verification modal (for disabling) */}
      {showPinVerify && !showChangePinVerify && !showPinSetup && (
        <PinScreen
          mode="verify"
          onComplete={handlePinVerifySuccess}
          onCancel={handlePinVerifyCancel}
          title="Disable App Lock"
          subtitle="Enter your PIN to disable app lock"
        />
      )}
      {/* PIN verification modal (for changing PIN) - Must show first */}
      {showChangePinVerify && (
        <PinScreen
          key="change-pin-verify"
          mode="verify"
          onComplete={handleChangePinVerifySuccess}
          onCancel={handleChangePinVerifyCancel}
          title="Change PIN"
          subtitle="Enter your current PIN to change it"
        />
      )}
      {/* PIN setup modal (for enabling or changing) - Only show if verification is not showing */}
      {showPinSetup && !showChangePinVerify && (
        <PinScreen
          key={isChangingPin ? "change-pin-setup" : "setup-pin"}
          mode="setup"
          onComplete={handlePinSetupComplete}
          onCancel={handlePinSetupCancel}
        />
      )}
      {/* Main Settings Screen */}
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

            {/* Security Settings */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Security
              </Text>

              {/* Security Lock Toggle */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Ionicons
                        name="lock-closed"
                        size={18}
                        color="#3B82F6"
                        style={{ marginRight: 8 }}
                      />
                      <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                        App Lock
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {isLockEnabled
                        ? "Protect your app with PIN and biometric authentication"
                        : "Enable PIN and biometric authentication to secure your app"}
                    </Text>
                  </View>
                  <Switch
                    value={isLockEnabled}
                    onValueChange={async (enabled) => {
                      if (enabled) {
                        // Show warning about data loss
                        alert(
                          "Enable App Lock",
                          "You will need to set up a PIN. If you forget your PIN and don't have a backup, your data might be lost.\n\nMake sure to remember your PIN or keep a backup of your data.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Continue",
                              style: "default",
                              onPress: () => {
                                setShowPinSetup(true);
                              },
                            },
                          ],
                        );
                      } else {
                        // Disable security - require PIN verification first
                        setShowPinVerify(true);
                      }
                    }}
                    trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Status Info */}
                {isLockEnabled && (
                  <View className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <View className="flex-row items-start gap-2">
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color="#3B82F6"
                        style={{ marginTop: 2 }}
                      />
                      <View className="flex-1">
                        <Text className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
                          Security Active
                        </Text>
                        <Text className="text-xs text-blue-700 dark:text-blue-300">
                          {isBiometricEnabled
                            ? "PIN and biometric authentication are enabled"
                            : "PIN authentication is enabled"}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Change PIN Button (only show if enabled) */}
              {isLockEnabled && (
                <TouchableOpacity
                  onPress={() => {
                    // Reset all related states first
                    setShowPinSetup(false);
                    setShowPinVerify(false);
                    setIsChangingPin(false);
                    // Then open verification modal
                    setShowChangePinVerify(true);
                  }}
                  className="flex-row items-center justify-between py-3 mb-2"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="key-outline" size={18} color="#3B82F6" />
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Change PIN
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
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
                    Notifications are disabled. Please enable them in your
                    device settings.
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

            {/* Transaction Defaults */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Transaction Defaults
              </Text>

              {/* Default Tags Selector */}
              <View className="mb-4">
                {/* Button to Open Bottom Sheet - Similar to Data Management */}
                <TouchableOpacity
                  onPress={() => defaultTagSelectorRef.current?.present()}
                  className="flex-row items-center justify-between py-3"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                      <Ionicons name="pricetags" size={20} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Default Tags
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {settings.defaultTagIds &&
                        settings.defaultTagIds.length > 0
                          ? `${settings.defaultTagIds.length} tag${
                              settings.defaultTagIds.length > 1 ? "s" : ""
                            } selected`
                          : "Select tags to auto-apply when creating transactions"}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Selected Tags Chips - Display below button if tags are selected */}
                {settings.defaultTagIds &&
                  settings.defaultTagIds.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mt-3">
                      {settings.defaultTagIds.map((tagId) => {
                        const tag = tags?.find((t) => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <View
                            key={tagId}
                            className="flex-col items-start gap-1"
                          >
                            <TagChip
                              name={tag.name}
                              selected={true}
                              showIcon={false}
                              size="small"
                              onPress={() => {
                                const updatedIds =
                                  settings.defaultTagIds.filter(
                                    (id) => id !== tagId,
                                  );
                                updateDefaultTagIds(updatedIds);
                              }}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}

                {/* Multi-Select Bottom Sheet - Hidden input, only bottom sheet */}
                {tags && tags.length > 0 && (
                  <View style={{ height: 0, overflow: "hidden" }}>
                    <BottomSheetMultiSelect
                      ref={defaultTagSelectorRef}
                      label=""
                      options={tags.map((tag) => ({
                        label: tag.name,
                        value: tag.id,
                      }))}
                      value={settings.defaultTagIds || []}
                      onValueChange={(selectedIds) => {
                        updateDefaultTagIds(selectedIds as number[]);
                      }}
                      placeholder="Select default tags"
                      showSelectAll={true}
                    />
                  </View>
                )}
              </View>
            </Card>

            {/* Exchange Feature Toggle */}
            <Card className="mb-4">
              <View className="mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="swap-horizontal"
                        size={18}
                        color="#3B82F6"
                        style={{ marginRight: 8 }}
                      />
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
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#10B981"
                      style={{ marginRight: 8, marginTop: 2 }}
                    />
                    <Text className="text-sm text-green-800 dark:text-green-200 flex-1">
                      Exchange feature is enabled. You can now track money
                      you've lent to others or borrowed from others.
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
                      Creates an encrypted ZIP (SQLite, MMKV, metadata) and
                      opens sharing
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

              {/* Import Bank Statement */}
              <TouchableOpacity
                onPress={handleImportBankStatement}
                className="flex-row items-center justify-between py-3 mb-3"
                activeOpacity={0.7}
                disabled={isImportingBankStatement}
                style={{ opacity: isImportingBankStatement ? 0.6 : 1 }}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2">
                    <Ionicons
                      name="document-attach"
                      size={20}
                      color="#9333EA"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Import Bank Statement
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Import transactions from Excel/CSV (HDFC supported)
                    </Text>
                    {isImportingBankStatement && (
                      <Text className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Selecting file...
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Export to Excel */}
              <TouchableOpacity
                onPress={() => setShowExcelExportModal(true)}
                className="flex-row items-center justify-between py-3 mb-3"
                activeOpacity={0.7}
                disabled={isExportingExcel}
                style={{ opacity: isExportingExcel ? 0.6 : 1 }}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                    <Ionicons name="document-text" size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Export to Excel
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Export transactions to Excel format (readable format)
                    </Text>
                    {isExportingExcel && (
                      <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Generating Excel file...
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
                      Permanently delete all accounts, transactions, categories,
                      and tags
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
                      <Ionicons
                        name="cloud-offline"
                        size={20}
                        color="#F59E0B"
                      />
                      <Text className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">
                        Network is not available. Session check will be
                        performed when network becomes available.
                      </Text>
                    </View>
                  </View>
                  {isAuthenticated && (
                    <View className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                      <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Logged in as {user?.email || "User"} (session cached)
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
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10B981"
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Logged in as {user?.email || "User"}
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
                        alert("Error", "Failed to logout. Please try again.");
                      }
                    }}
                    className="flex-row items-center justify-center bg-red-600 dark:bg-red-500 px-6 py-3 rounded-xl"
                  >
                    <Ionicons
                      name="log-out"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-semibold text-base">
                      Logout
                    </Text>
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
                      <Ionicons
                        name="cloud-offline"
                        size={20}
                        color="#EF4444"
                      />
                      <Text className="text-sm text-red-800 dark:text-red-200 flex-1">
                        Network is not available. Cloud backup requires an
                        active internet connection. Please check your network
                        connection.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    disabled={true}
                    className="flex-row items-center justify-between py-3 mb-3 opacity-50"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                        <Ionicons
                          name="cloud-upload"
                          size={20}
                          color="#3B82F6"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                          Upload Backup to Cloud
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Upload or schedule cloud backup (keeps latest 3)
                        </Text>
                        <Text className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Network not available
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
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
                        To use cloud backup, please login with your Google
                        account. This allows you to automatically backup your
                        data to the cloud and restore from any of your latest 3
                        backups.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    disabled={true}
                    className="flex-row items-center justify-between py-3 mb-3 opacity-50"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                        <Ionicons
                          name="cloud-upload"
                          size={20}
                          color="#3B82F6"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                          Upload Backup to Cloud
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Upload or schedule cloud backup (keeps latest 3)
                        </Text>
                        <Text className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Session not available - Please login
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                /* Network available and authenticated - enable cloud backup */
                <View>
                  {autoCloudBackupEnabled && backgroundBackupWarning ? (
                    <View className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-3">
                      <View className="flex-row items-start gap-3">
                        <Ionicons name="warning" size={20} color="#F59E0B" />
                        <Text className="text-sm text-amber-800 dark:text-amber-200 flex-1">
                          {backgroundBackupWarning}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  <View className="flex-row items-center justify-between py-3 mb-2 border-b border-gray-100 dark:border-gray-800">
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                        Automatic daily backup
                      </Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {autoCloudBackupEnabled
                          ? "On — backs up to cloud around 10–11 PM when possible (keeps latest 3)"
                          : "Off — turn on to schedule daily cloud backups at night"}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last automatic backup:{" "}
                        {formatLastBackupLabel(lastAutoCloudBackupDate)}
                        {isWithinDailyBackupWindow()
                          ? " · Window active now"
                          : ""}
                      </Text>
                      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Runs in the background when the app is not open. On iOS,
                        force-quitting the app pauses background backups until
                        you open it again.
                      </Text>
                    </View>
                    <Switch
                      value={autoCloudBackupEnabled}
                      onValueChange={async (enabled) => {
                        cloudBackupScheduleStorage.setAutoBackupEnabled(
                          enabled,
                        );
                        setAutoCloudBackupEnabled(enabled);
                        try {
                          if (enabled) {
                            const result =
                              await registerCloudBackupBackgroundTask();
                            if (!result.registered && result.message) {
                              setBackgroundBackupWarning(result.message);
                              alert(
                                "Background backup limited",
                                `${result.message}\n\nYou can still use "Upload backup now" or open the app after 10 PM for catch-up backups.`,
                              );
                            } else {
                              setBackgroundBackupWarning(null);
                            }
                          } else {
                            await unregisterCloudBackupBackgroundTask();
                            setBackgroundBackupWarning(null);
                          }
                        } catch (error) {
                          reportAutoBackupError(error, {
                            phase: "settings_toggle",
                            toggleEnabled: enabled,
                          });
                        }
                      }}
                      trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!user?.id) {
                        alert(
                          "Error",
                          "User ID not found. Please login again.",
                        );
                        return;
                      }

                      setIsUploadingToCloud(true);
                      try {
                        const { error, success } = await uploadBackupToCloud(
                          user.id,
                        );
                        if (error || !success) {
                          alert(
                            "Error",
                            error?.message ??
                              "Failed to upload backup to cloud. Please try again.",
                          );
                          return;
                        }
                        const todayKey = formatLocalDateKey();
                        cloudBackupScheduleStorage.setLastBackupDate(todayKey);
                        setLastAutoCloudBackupDate(todayKey);
                        alert(
                          "Success",
                          "Backup uploaded to cloud successfully!",
                        );
                        // Trigger backup list refresh
                        setBackupListRefreshTrigger((prev) => prev + 1);
                      } catch (error) {
                        logError("Error uploading to cloud:", error);
                        alert("Error", "An unexpected error occurred.");
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
                          <Ionicons
                            name="cloud-upload"
                            size={20}
                            color="#3B82F6"
                          />
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                          Upload backup now
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Upload a backup immediately (keeps latest 3 in cloud)
                        </Text>
                        {isUploadingToCloud && (
                          <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Uploading backup...
                          </Text>
                        )}
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                  <View className="mt-2">
                    {user?.id && (
                      <BackupList
                        userId={user.id}
                        refreshTrigger={backupListRefreshTrigger}
                      />
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
                      <Ionicons
                        name="cloud-download"
                        size={20}
                        color="#DC2626"
                      />
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

        {/* Excel Export Date Range Picker Modal */}
        <DateRangePickerModal
          visible={showExcelExportModal}
          onClose={() => setShowExcelExportModal(false)}
          onConfirm={handleExcelExport}
          isLoading={isExportingExcel}
        />

        {/* Dummy Data Size Selection Bottom Sheet */}
        <DummyDataSizeBottomSheet
          ref={dummyDataSizeBottomSheetRef}
          onSelect={handleDummyDataSizeSelect}
        />

        <BankSelectionBottomSheet
          ref={bankSelectionBottomSheetRef}
          onBankSelected={handleBankSelected}
        />
      </SafeAreaView>
    </>
  );
}
