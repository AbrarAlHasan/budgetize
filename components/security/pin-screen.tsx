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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PinNumpad } from "./pin-numpad";

type PinScreenMode = "setup" | "verify";

interface PinScreenProps {
  mode: PinScreenMode;
  onComplete: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}

type SetupStep = "enter" | "confirm" | "verify";

export function PinScreen({
  mode,
  onComplete,
  onCancel,
  title: customTitle,
  subtitle: customSubtitle,
}: PinScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { setPin: savePin, verifyPin } = useSecurityStore();
  const { alert } = useCustomAlert();

  // Setup mode state
  const [step, setStep] = useState<SetupStep>("enter");
  const [pin, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifyCurrentPin, setVerifyCurrentPin] = useState(""); // For verifying current PIN before change

  // Verify mode state
  const [verifyPinValue, setVerifyPinValue] = useState("");

  // Common state
  const [error, setError] = useState("");

  const shakeAnimation = useSharedValue(0);
  const errorOpacity = useSharedValue(0);

  const isSetupMode = mode === "setup";
  const currentPin = isSetupMode
    ? step === "enter"
      ? pin
      : step === "confirm"
      ? confirmPin
      : verifyCurrentPin
    : verifyPinValue;

  const pinDots = Array(4).fill(0);

  // Dynamic titles and subtitles
  const getTitle = () => {
    if (customTitle) return customTitle;
    if (isSetupMode) {
      if (step === "verify") return "Verify Current PIN";
      return step === "enter" ? "Create a PIN" : "Confirm your PIN";
    }
    return "Enter PIN";
  };

  const getSubtitle = () => {
    if (customSubtitle) return customSubtitle;
    if (isSetupMode) {
      if (step === "verify") return "Enter your current PIN to change it";
      return step === "enter"
        ? "Enter a 4-digit PIN to secure your app"
        : "Re-enter your PIN to confirm";
    }
    return "Enter your PIN to continue";
  };

  const getHeaderTitle = () => {
    if (isSetupMode) {
      return step === "enter" ? "Create PIN" : "Confirm PIN";
    }
    return customTitle || "Enter PIN";
  };

  const handleDigitPress = async (digit: string) => {
    if (isSetupMode) {
      // Setup mode logic
      if (step === "verify") {
        // Verify current PIN before allowing change
        if (verifyCurrentPin.length >= 4) return;
        const newVerifyPin = verifyCurrentPin + digit;
        setVerifyCurrentPin(newVerifyPin);
        setError("");

        if (newVerifyPin.length === 4) {
          const isValid = await verifyPin(newVerifyPin);
          if (isValid) {
            // PIN verified, allow change
            setStep("enter");
            setPinValue("");
            setConfirmPin("");
            setVerifyCurrentPin("");
            setError("");
          } else {
            // Invalid PIN - shake and reset
            shakeAnimation.value = withSequence(
              withTiming(-10, { duration: 50 }),
              withSpring(0, { damping: 15 })
            );
            errorOpacity.value = withSequence(
              withTiming(1, { duration: 200 }),
              withTiming(0, { duration: 2000 })
            );
            setError("Incorrect PIN");
            setVerifyCurrentPin("");
          }
        }
      } else if (step === "enter") {
        if (pin.length >= 4) return;
        const newPin = pin + digit;
        setPinValue(newPin);
        setError("");

        if (newPin.length === 4) {
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
    } else {
      // Verify mode logic
      if (verifyPinValue.length >= 4) return;

      const newPin = verifyPinValue + digit;
      setVerifyPinValue(newPin);
      setError("");

      if (newPin.length === 4) {
        const isValid = await verifyPin(newPin);
        if (isValid) {
          onComplete();
        } else {
          // Shake animation and error
          shakeAnimation.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withSpring(0, { damping: 15 })
          );
          errorOpacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(0, { duration: 2000 })
          );
          setError("Incorrect PIN");
          setVerifyPinValue("");
        }
      }
    }
  };

  const handlePinConfirmed = async () => {
    try {
      await savePin(pin);
      onComplete();
    } catch (error) {
      logError("Error saving PIN:", error);
      alert("Error", "Failed to save PIN. Please try again.");
    }
  };

  const handleBackspace = () => {
    if (isSetupMode) {
      if (step === "verify") {
        setVerifyCurrentPin((prev) => prev.slice(0, -1));
      } else if (step === "enter") {
        setPinValue((prev) => prev.slice(0, -1));
      } else if (step === "confirm") {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    } else {
      setVerifyPinValue((prev) => prev.slice(0, -1));
    }
    setError("");
  };

  const handleBack = () => {
    if (isSetupMode) {
      if (step === "verify") {
        // Go back to confirm step from verify
        setStep("confirm");
        setVerifyCurrentPin("");
        setError("");
      } else if (step === "confirm") {
        setStep("enter");
        setConfirmPin("");
        setError("");
      } else {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  const handleChangePin = () => {
    // First verify current PIN before allowing change
    setStep("verify");
    setVerifyCurrentPin("");
    setError("");
  };

  const handleCancel = () => {
    // Reset all state before canceling
    if (isSetupMode) {
      setStep("enter");
      setPinValue("");
      setConfirmPin("");
    } else {
      setVerifyPinValue("");
    }
    setError("");
    onCancel();
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnimation.value }],
  }));

  const errorStyle = useAnimatedStyle(() => ({
    opacity: errorOpacity.value,
  }));

  const bgColor = isDark ? "#000000" : "#ffffff";
  const textColor = isDark ? "#ECEDEE" : "#11181C";
  const subtitleColor = isDark ? "#9BA1A6" : "#687076";
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={handleBack}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Cancel Button - Top Right */}
          <View style={styles.cancelButtonContainer}>
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.7}
              style={styles.cancelButtonTop}
            >
              <Text style={[styles.cancelButtonText, { color: subtitleColor }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <View style={styles.scrollableContent}>
            {/* Top Section: Icon, Title, Subtitle */}
            <View style={styles.topSection}>
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
                {getTitle()}
              </Text>

              {/* Subtitle */}
              <Text style={[styles.subtitle, { color: subtitleColor }]}>
                {getSubtitle()}
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

            {/* Bottom Section: Numpad */}
            <View style={styles.bottomSection}>
              {/* Numpad */}
              <View style={styles.numpadContainer}>
                <PinNumpad
                  onDigitPress={handleDigitPress}
                  onBackspace={handleBackspace}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 8,
    minHeight: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  cancelButtonContainer: {
    alignItems: "flex-end",
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingBottom: 8,
  },
  cancelButtonTop: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  scrollableContent: {
    flex: 1,
  },
  topSection: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 20 : 24,
    flexShrink: 0,
  },
  iconContainer: {
    marginBottom: 16,
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
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  middleSection: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 24,
  },
  pinDotsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
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
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
    textAlign: "center",
  },
  changePinText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.8,
  },
  bottomSection: {
    width: "100%",
    flexShrink: 0,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
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
