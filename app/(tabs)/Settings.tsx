import {
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/Colors";
import { textStyles } from "@/stylings/CustomStyles";
import CustomTextInput from "@/components/CustomTextInput";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import AntDesign from "@expo/vector-icons/AntDesign";
import { initiateLogout } from "@/api/authentication.action";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "@/components/BottomSheet";
import ResetPasswordModal from "@/components/Settings/ResetPasswordModal";
interface ICustomSettingsButton {
  leftIcon?: any;
  label?: string;
  rightIcon?: any;
  backgroundStyle?: ViewStyle;
  textStyle?: TextStyle;
  onPress: () => void;
}

const Settings = () => {
  const colorScheme = useColorScheme();
  const [name, setName] = useState<string | undefined>("");
  const [email, setEmail] = useState<string | undefined>("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const { userDetails } = useSelector((state: RootState) => state.AuthSlice);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);

  const handleCloseModalPress = useCallback(() => {
    bottomSheetModalRef.current?.close();
  }, []);

  useEffect(() => {
    setName(userDetails?.name);
    setEmail(userDetails?.email);
  }, [userDetails]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].background,
        paddingHorizontal: 20,
        position: "relative",
      }}
    >
      <Text
        style={[
          textStyles.sm,
          textStyles.mdBold,
          {
            color: Colors[colorScheme ?? "light"].darkText,
            marginVertical: 24,
          },
        ]}
      >
        Account Settings
      </Text>
      <CustomTextInput
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Name"
        disabled={true}
      />
      <CustomTextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        disabled={true}
      />
      <CustomSettingsButton
        label="Change Password"
        rightIcon={() => (
          <AntDesign
            name="right"
            size={18}
            color={Colors[colorScheme ?? "light"].gray}
          />
        )}
        onPress={() => {
          handlePresentModalPress();
        }}
      />

      <CustomSettingsButton
        label="Log Out"
        leftIcon={() => <Text>👋</Text>}
        textStyle={{ color: Colors[colorScheme ?? "light"].darkRed }}
        onPress={() => {
          initiateLogout();
        }}
      />
      <ResetPasswordModal
        bottomSheetModalRef={bottomSheetModalRef}
        email={email as string}
      />
    </View>
  );
};

const CustomSettingsButton = ({
  leftIcon = () => {},
  label,
  rightIcon = () => {},
  backgroundStyle = {},
  textStyle = {},
  onPress,
}: ICustomSettingsButton) => {
  const colorScheme = useColorScheme();

  return (
    <Pressable style={{ marginVertical: 10 }} onPress={onPress}>
      <View
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].lightGray,
          padding: 20,
          borderRadius: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          ...backgroundStyle,
        }}
      >
        {leftIcon()}
        <Text
          style={[
            textStyles.mdBold,
            {
              color: Colors[colorScheme ?? "light"].darkText,
              flex: 1,
              ...textStyle,
            },
          ]}
        >
          {label}
        </Text>
        {rightIcon()}
      </View>
    </Pressable>
  );
};

export default Settings;

const styles = StyleSheet.create({});
