import { StyleSheet, Text, useColorScheme, View } from "react-native";
import React from "react";
import BottomSheet from "./BottomSheet";
import { TouchableOpacity } from "react-native-gesture-handler";
import MaterialIcon from "@expo/vector-icons/MaterialIcons";
import { Colors } from "@/constants/Colors";
import { textStyles } from "@/stylings/CustomStyles";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

interface EditDeleteBottomSheetProps {
  editBottomSheetModalRef: React.RefObject<BottomSheetModal>;
  handleCloseModalPress: () => void;
  editTransaction: () => void;
  deleteTransaction: () => void;
}

const EditDeleteBottomSheet = ({
  editBottomSheetModalRef,
  handleCloseModalPress,
  editTransaction,
  deleteTransaction,
}: EditDeleteBottomSheetProps) => {
  const colorScheme = useColorScheme();
  return (
    <BottomSheet
      bottomSheetModalRef={editBottomSheetModalRef}
      onClose={handleCloseModalPress}
      snapPoints={["1%", "20%"]}
      index={1}
    >
      <>
        <TouchableOpacity onPress={() => editTransaction()}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <MaterialIcon
              name="edit-note"
              size={24}
              color={Colors[colorScheme ?? "light"].primary}
            />
            <Text
              style={[
                textStyles.sm,
                {
                  color: Colors[colorScheme ?? "light"].darkText,
                  textAlign: "center",
                },
              ]}
            >
              Edit Transaction
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={deleteTransaction}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
              width: "95%",
            }}
          >
            <MaterialIcon
              name="delete-outline"
              size={24}
              color={Colors[colorScheme ?? "light"].primary}
            />
            <Text
              style={[
                textStyles.sm,
                {
                  color: Colors[colorScheme ?? "light"].darkText,
                  textAlign: "center",
                },
              ]}
            >
              Delete Transaction{" "}
              <Text
                style={[
                  textStyles.xs,
                  { color: Colors[colorScheme ?? "light"].darkRed },
                ]}
              >
                (Action Cannot be Reversed)
              </Text>
            </Text>
          </View>
        </TouchableOpacity>
      </>
    </BottomSheet>
  );
};

export default EditDeleteBottomSheet;

const styles = StyleSheet.create({});
