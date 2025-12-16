import { useCustomAlert } from "@/hooks/use-custom-alert";
import { useSecurityStore } from "@/store/security-store";
import { logError } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { PinNumpad } from "./pin-numpad";

interface PinSetupScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

type SetupStep = "enter" | "confirm";

export function PinSetupScreen({ onComplete, onCancel }: PinSetupScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { setPin: savePin } = useSecurityStore();
  const { alert } = useCustomAlert();
  const [step, setStep] = useState<SetupStep>("enter");
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const shakeAnimation = useSharedValue(0);
  const errorOpacity = useSharedValue(0);

  const handleDigitPress = (digit: string) => {
    if (step === "enter") {
      if (pin.length >= 4) return;
      const newPin = pin + digit;
      setPinValue(newPin);
      setError("");

      if (newPin.length === 4) {
        // Move to confirm step after a brief delay
        setTimeout(() => {
          setStep("confirm");
        }, 300);
      }
    } else if (step === "confirm") {
      if (confirmPin.length >= 4) return;
      const newConfirmPin = confirmPin + digit;
      setConfirmPin(newConfirmPin);
      setError("");

      if (newConfirmPin.length === 4) {
        if (newConfirmPin === pin) {
          // PINs match, save and move to biometric step
          handlePinConfirmed();
        } else {
          // PINs don't match - shake and reset
          shakeAnimation.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withSpring(0, { damping: 15 })
          );
          errorOpacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(0, { duration: 2000 })
          );
          setError("PINs do not match");
          setConfirmPin("");
        }
      }
    }
  };

  const handlePinConfirmed = async () => {
    try {
      await savePin(pin);
      // After confirming PIN, complete immediately
      onComplete();
    } catch (error) {
      logError("Error saving PIN:", error);
      alert("Error", "Failed to save PIN. Please try again.");
    }
  };

  const handleBackspace = () => {
    if (step === "enter") {
      setPinValue((prev) => prev.slice(0, -1));
    } else if (step === "confirm") {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
    setError("");
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("enter");
      setConfirmPin("");
      setError("");
    } else {
      onCancel();
    }
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnimation.value }],
  }));

  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const currentPin = step === "enter" ? pin : confirmPin;
  const pinDots = Array(4).fill(0);

  const bgColor = isDark ? "#000000" : "#ffffff";
  const textColor = isDark ? "#ECEDEE" : "#11181C";
  const subtitleColor = isDark ? "#9BA1A6" : "#687076";

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={handleBack}
    >
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={isDark ? "#ECEDEE" : "#11181C"}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {step === "enter" ? "Create PIN" : "Confirm PIN"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content Container - No ScrollView, fits all content */}
          <View style={styles.contentContainer}>
            {/* Top Section: Icon, Title, Subtitle */}
            <View style={[styles.topSection]}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View
                  style={[
                    styles.iconWrapper,
                    {
                      backgroundColor: isDark ? "#1a1a1a" : "#f3f4f6",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isDark ? 0.3 : 0.1,
                      shadowRadius: 8,
                      elevation: 4,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={40}
                    color={isDark ? "#60A5FA" : "#3B82F6"}
                  />
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: textColor }]}>
                {step === "enter" ? "Create a PIN" : "Confirm your PIN"}
              </Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, { color: subtitleColor }]}>
                {step === "enter"
                  ? "Enter a 4-digit PIN to secure your app"
                  : "Re-enter your PIN to confirm"}
              </Text>
            </View>

            {/* Middle Section: PIN Dots and Error */}
            <View style={styles.middleSection}>
              {/* PIN Dots */}
              <Animated.View style={[styles.pinDotsContainer, shakeStyle]}>
                {pinDots.map((_, index) => {
                  const isFilled = index < currentPin.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.pinDot,
                        {
                          backgroundColor: isFilled
                            ? isDark
                              ? "#60A5FA"
                              : "#3B82F6"
                            : isDark
                            ? "#374151"
                            : "#e5e7eb",
                          borderColor: isFilled
                            ? isDark
                              ? "#60A5FA"
                              : "#3B82F6"
                            : isDark
                            ? "#4b5563"
                            : "#d1d5db",
                        },
                      ]}
                    />
                  );
                })}
              </Animated.View>

              {/* Error Message */}
              <Animated.View style={[styles.errorContainer, errorStyle]}>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </Animated.View>
            </View>

            {/* Bottom Section: Warning and Numpad */}
            <View style={styles.bottomSection}>
              {/* Warning */}
              <View
                style={[
                  styles.warningContainer,
                  {
                    backgroundColor: isDark ? "#1a1a1a" : "#fef3c7",
                    borderColor: isDark ? "#374151" : "#fbbf24",
                  },
                ]}
              >
                <Ionicons
                  name="warning"
                  size={18}
                  color={isDark ? "#fbbf24" : "#d97706"}
                  style={styles.warningIcon}
                />
                <Text
                  style={[
                    styles.warningText,
                    {
                      color: isDark ? "#fbbf24" : "#92400e",
                    },
                  ]}
                >
                  If you forget your PIN and don't have a backup, your data
                  might be lost. Make sure to remember your PIN or keep a
                  backup.
                </Text>
              </View>

              {/* Numpad */}
              <View style={styles.numpadContainer}>
                <PinNumpad
                  onDigitPress={handleDigitPress}
                  onBackspace={handleBackspace}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    paddingTop: 20,
    flexShrink: 0,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  middleSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  pinDotsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorContainer: {
    height: 24,
    justifyContent: "center",
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
    textAlign: "center",
  },
  bottomSection: {
    width: "100%",
    flexShrink: 0,
    paddingTop: 20,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    width: "100%",
  },
  warningIcon: {
    marginTop: 2,
    marginRight: 10,
    flexShrink: 0,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  numpadContainer: {
    width: "100%",
  },
});
