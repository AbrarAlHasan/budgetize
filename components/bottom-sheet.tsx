import { getBackgroundColor, getHandleIndicatorColor } from "@/utils/colors";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetScrollView
} from "@gorhom/bottom-sheet";
import { BottomSheetModalMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useColorScheme } from "nativewind";
import React, { ReactElement, useCallback, useMemo } from "react";
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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // NativeWind theme-aware styles using Tailwind color system
  // Matches: bg-white dark:bg-gray-800
  const backgroundStyle = useMemo(() => ({
    backgroundColor: getBackgroundColor(isDark),
  }), [isDark]);

  // Matches: bg-gray-300 dark:bg-gray-600
  const handleIndicatorStyle = useMemo(() => ({
    backgroundColor: getHandleIndicatorColor(isDark),
  }), [isDark]);

  // Matches: bg-white dark:bg-gray-800
  const scrollViewStyle = useMemo(() => ({
    backgroundColor: getBackgroundColor(isDark),
  }), [isDark]);

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
      enablePanDownToClose={true}
      enableDismissOnClose={true}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      {...props}
    >
      <BottomSheetScrollView
        bounces={false}
        className="flex-1"
        style={[
          styles.contentContainer,
          scrollViewStyle,
          {
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
