import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React, { ReactElement } from "react";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Colors } from "@/constants/Colors";

interface IBottomSheet {
  children: ReactElement;
  snapPoints?: Array<string>;
  bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>;
  index: number;
}

const BottomSheet = ({
  children,
  bottomSheetModalRef,
  snapPoints = ["25%", "50%", "75%", "100%"],
  index = 1,
}: IBottomSheet) => {
  const colorScheme = useColorScheme();
  return (
    <BottomSheetModalProvider>
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={index}
        snapPoints={snapPoints}
        onChange={(data) => console.log(data)}
      >
        <BottomSheetView
          style={[
            styles.contentContainer,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
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
    alignItems: "center",
    padding: 20,
  },
});
