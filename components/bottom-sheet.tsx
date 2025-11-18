import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetModalProps,
    BottomSheetScrollView
} from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import React, { ReactElement, useCallback } from "react";
import {
    StyleSheet,
    ViewStyle
} from "react-native";

export interface IBottomSheet extends BottomSheetModalProps {
  children: ReactElement;
  snapPoints?: Array<string>;
  bottomSheetModalRef: React.RefObject<BottomSheetModalMethods>;
  index?: number;
  onBottomSheetChange?: (data: number) => void;
  onClose?: () => void;
  containerStyle?: ViewStyle;
  renderFooter?: ReactElement;
}

const BottomSheet = ({
  children,
  bottomSheetModalRef,
  snapPoints = ["25%", "50%", "75%", "90%"],
  index = 1,
  onBottomSheetChange = () => {},
  onClose,
  containerStyle = {},
  renderFooter,
  ...props
}: IBottomSheet) => {
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        opacity={0.5}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        onPress={() => {
          onClose && onClose();
        }}
        {...props}
      />
    ),
    [onClose]
  );

  return (
    <BottomSheetModal
      backdropComponent={renderBackdrop}
      ref={bottomSheetModalRef}
      index={index}
      snapPoints={snapPoints}
      onChange={(data) => {
        onBottomSheetChange(data);
      }}
      {...props}
    >
      <BottomSheetScrollView
        bounces={false}
        style={[
          styles.contentContainer,
          {
            backgroundColor: "white",
            // borderRadius: 32,
            // borderWidth: 1,
            // borderColor: Colors[colorScheme ?? "light"].gray,
            shadowColor: "black",
            shadowOffset: { width: 1, height: -3 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 5,
          },
        ]}
      >
        {children}
      </BottomSheetScrollView>
      {renderFooter && renderFooter}
    </BottomSheetModal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
  },
});
