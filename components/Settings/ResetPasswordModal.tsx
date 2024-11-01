import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import BottomSheet from "../BottomSheet";
import CustomTextInput from "../CustomTextInput";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import CustomButton from "../CustomButton";
import { useToast } from "react-native-toast-notifications";
import { supabase } from "@/lib/supabase";
import {
  setCheckingAuthentication,
  setUserDetails,
} from "@/redux/reducers/slice/authSlice";
import { useDispatch } from "react-redux";
import { initiateLogin } from "@/api/authentication.action";
import { router, useFocusEffect } from "expo-router";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";

interface IResetPasswordModal {
  bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>;
  existingPassword?: string;
  email: string;
}

const ResetPasswordModal = ({
  bottomSheetModalRef,
  existingPassword,
  email,
}: IResetPasswordModal) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [bottomSheetSnap, setBottomSheetSnap] = useState(2);

  const onBottomSheetChange = (data: number) => {
    if (data === -1) {
      setCurrentPassword(existingPassword ?? "");
    }
  };

  const toast = useToast();
  const dispatch = useDispatch();

  useEffect(() => {
    setCurrentPassword(existingPassword ?? "");
  }, []);

  const validate = () => {
    if (!currentPassword?.trim()) {
      toast.show("Please Enter Current Password", { type: "danger" });
      return false;
    }

    if (!newPassword?.trim()) {
      toast.show("Please Enter New Password", { type: "danger" });
      return false;
    }

    if (!confirmNewPassword?.trim()) {
      toast.show("Please Re Enter New Password", { type: "danger" });
      return false;
    }

    if (confirmNewPassword?.trim() !== newPassword?.trim()) {
      toast.show(
        "New Password and the Re Entered Password is not Same. Please recheck",
        { type: "danger" }
      );
      return false;
    }
    return true;
  };
  const onConfirmPassword = async () => {
    try {
      Keyboard.dismiss();
      dispatch(enableLoading());
      if (validate() && (await checkCurrentPasswordIsCorrect())) {
        const passwordChangeResponse = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordChangeResponse.error === null && existingPassword) {
          const response = await supabase
            .from("users")
            .update({ initial_password_changed: true })
            .eq("email", email);

          const { data, error } = await supabase
            .from("users")
            .select()
            .eq("email", email)
            .limit(1)
            .maybeSingle();
          if (error == null) {
            dispatch(setUserDetails(data));
            dispatch(
              setCheckingAuthentication({
                isAuthenticated: true,
                checkingAuthentication: false,
              })
            );
            toast.show("Password Change Successfull", { type: "success" });
            bottomSheetModalRef.current?.close();
            router.replace("/(tabs)/");
          }
          dispatch(disableLoading());
          return;
        }

        if (passwordChangeResponse.error === null) {
          toast.show("Password Change Successfull", { type: "success" });
          bottomSheetModalRef.current?.close();
        }
      }
    } catch (error) {
    } finally {
      setConfirmNewPassword("");
      setNewPassword("");
      dispatch(disableLoading());
    }
  };

  const checkCurrentPasswordIsCorrect = async () => {
    try {
      const { data, error }: { data: any; error: any } = await initiateLogin(
        email,
        currentPassword
      );
      if (error === null) {
        return true;
      }
      toast.show("Current Password is InCorrect", { type: "danger" });
      return false;
    } catch (error) {
      toast.show("Something Went Wrong When Checking the Current Password", {
        type: "danger",
      });
      console.log(error);
      return false;
    }
  };
  return (
    <BottomSheet
      bottomSheetModalRef={bottomSheetModalRef}
      index={bottomSheetSnap}
      onBottomSheetChange={onBottomSheetChange}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <KeyboardAvoidingView style={{ flex: 1, width: "100%" }}>
          <CustomTextInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current Password"
            onFocus={() => {
              setBottomSheetSnap(3);
            }}
          />
          <CustomTextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password"
            onFocus={() => {
              setBottomSheetSnap(3);
            }}
          />
          <CustomTextInput
            label="Confirm Password"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="Confirm New Password"
            onFocus={() => {
              setBottomSheetSnap(3);
            }}
          />
          <View>
            <CustomButton
              label="Confirm Password"
              colorType="primary"
              onPress={onConfirmPassword}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </BottomSheet>
  );
};

export default ResetPasswordModal;

const styles = StyleSheet.create({});
