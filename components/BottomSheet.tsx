import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { ReactElement, useCallback } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Colors } from "@/constants/Colors";
import { router } from "expo-router";

interface IBottomSheet {
  children: ReactElement;
  snapPoints?: Array<string>;
  bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>;
  index?: number;
  onBottomSheetChange?: (data: number) => void;
  onClose?: () => void;
}

const BottomSheet = ({
  children,
  bottomSheetModalRef,
  snapPoints = ["25%", "50%", "75%", "90%"],
  index = 1,
  onBottomSheetChange = () => {},
  onClose,
  containerStyle = {},
}: IBottomSheet) => {
  const colorScheme = useColorScheme();

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        opacity={0.8}
        style={{ backgroundColor: "transparent" }}
        onPress={() => {
          onClose && onClose();
        }}
        {...props}
      />
    ),
    []
  );

  return (
    <BottomSheetModalProvider>
      <BottomSheetModal
        backdropComponent={renderBackdrop}
        ref={bottomSheetModalRef}
        index={index}
        snapPoints={snapPoints}
        onChange={(data) => {
          onBottomSheetChange(data);
        }}
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].background,
        }}
        handleStyle={{
          backgroundColor: `${Colors[colorScheme ?? "light"].background}`,
        }}
        handleIndicatorStyle={{
          backgroundColor: Colors[colorScheme ?? "light"].darkText,
        }}
      >
        <BottomSheetView
          style={[
            styles.contentContainer,
            {
              backgroundColor: Colors[colorScheme ?? "light"].background,
              // borderRadius: 32,
              // borderWidth: 1,
              // borderColor: Colors[colorScheme ?? "light"].gray,
              shadowColor: Colors[colorScheme ?? "light"].gray,
              shadowOffset: { width: 1, height: -3 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 5,
            },
          ]}
        >
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
  },
});
