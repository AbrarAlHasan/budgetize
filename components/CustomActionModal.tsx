import { Colors } from "@/constants/Colors";
import { textStyles } from "@/stylings/CustomStyles";
import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  useColorScheme,
  ViewProps,
  TextProps,
  ViewStyle,
  TextStyle,
} from "react-native";
import CustomButton from "./CustomButton";

type CustomActionModalProps = {
  visible: boolean; // Controls the visibility of the modal
  onClose: () => void; // Function to close the modal
  title?: string; // Title of the modal
  message: string; // Message or content of the modal
  onConfirm?: () => void; // Function for confirm action (optional)
  confirmLabel?: string; // Label for confirm button
  cancelLabel?: string; // Label for cancel button
  confirmButtonStyle?: ViewStyle;
  cancelButtonStyle?: ViewStyle;
  cancelTextColor?: TextStyle["color"];
  confirmTextColor?: TextStyle["color"];
};

const CustomActionModal: React.FC<CustomActionModalProps> = ({
  visible,
  onClose,
  title = "Confirmation",
  message,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmButtonStyle = {},
  cancelButtonStyle = {},
  cancelTextColor = "",
  confirmTextColor = "",
}) => {
  const colorScheme = useColorScheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {title ? (
                <Text
                  style={[
                    textStyles.bolder,
                    textStyles.md,
                    {
                      color: Colors[colorScheme ?? "light"].darkText,
                      textAlign: "center",
                      marginBottom: 20,
                    },
                  ]}
                >
                  {title}
                </Text>
              ) : null}
              <Text
                style={[
                  textStyles.sm,
                  {
                    color: Colors[colorScheme ?? "light"].darkText,
                    textAlign: "center",
                    marginBottom: 20,
                  },
                ]}
              >
                {message}
              </Text>

              <View style={styles.buttonContainer}>
                <CustomButton
                  label={cancelLabel}
                  colorType="gray"
                  onPress={onClose}
                  customStyle={{ width: "auto", ...cancelButtonStyle }}
                  customTextColor={cancelTextColor}
                />
                {onConfirm && (
                  <CustomButton
                    label={confirmLabel}
                    colorType="danger"
                    onPress={onConfirm}
                    customStyle={{ width: "auto", ...confirmButtonStyle }}
                  />
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default CustomActionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  cancelButton: {
    backgroundColor: "#ddd",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#333",
  },
  confirmButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#fff",
  },
});
