import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import Animated, { FadeIn, FadeOutUp } from "react-native-reanimated";
import { Image } from "expo-image";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AntIcon from "@expo/vector-icons/AntDesign";
import * as Progress from "react-native-progress";
import PaytmLogo from "@/assets/images/paytmLogo.png";
import { ITransactionFileForProcessing } from "@/types/TransactionScreenTypes";
import { DocumentPickerAsset } from "expo-document-picker";
import {
  ISelectedDocuments,
  ISelectedDocumetsUploadStatus,
  StatusEnum,
} from "..";
import { useToast } from "react-native-toast-notifications";
import { router } from "expo-router";

interface TransactionListProps {
  transaction: ITransactionFileForProcessing | ISelectedDocuments;
  index: number;
  removeDocument: (index: number, storage: "SERVER" | "LOCAL") => void;
  storage: "SERVER" | "LOCAL";
  animationDelay?: number;
}

const UploadTransactionList = ({
  transaction,
  index,
  removeDocument,
  storage,
  animationDelay = 100,
}: TransactionListProps) => {
  const colorScheme = useColorScheme();
  const toast = useToast();
  return (
    <Animated.View
      entering={FadeIn.delay(animationDelay * index)}
      style={{
        width: "90%",
      }}
      key={transaction?.uri || transaction?.uniqueName}
    >
      <TouchableOpacity
        onPress={() => {
          transaction?.status === "SYNCHED" &&
            router.navigate({
              pathname: "/verifyTransactions",
              params: { fileName: transaction?.uniqueName },
            });
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 10,
            marginTop: 20,
            gap: 12,
            width: "100%",
          }}
        >
          <Image source={PaytmLogo} style={{ width: 24, height: 24 }} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                textStyles.sm,
                textStyles.mdBold,
                commonStyles.alignJustifyCenter,
                {
                  color: Colors[colorScheme ?? "light"].darkText,
                },
              ]}
              numberOfLines={2}
            >
              {transaction?.name}
            </Text>
            {transaction?.size && (
              <Text
                style={[
                  textStyles.xs,
                  commonStyles.alignJustifyCenter,
                  {
                    color: Colors[colorScheme ?? "light"].gray,
                  },
                ]}
              >
                {((transaction?.size || 0) / (1024 * 1024)).toFixed(2) + " MB"}
              </Text>
            )}
          </View>
          {transaction?.status === StatusEnum.UPLOADING && (
            <Animated.View>
              <Progress.Circle
                size={30}
                indeterminate={false}
                progress={transaction?.uploadingStatus}
                textStyle={{ fontWeight: "bold" }}
              />
            </Animated.View>
          )}

          {(transaction?.status === StatusEnum.UPLOADED ||
            transaction?.status === "PROCESSED") && (
            <Animated.View>
              <AntIcon
                name="warning"
                size={20}
                color={Colors[colorScheme ?? "light"].darkOrange}
              />
            </Animated.View>
          )}
          {transaction?.status === "SYNCHED" && (
            <Animated.View>
              <AntIcon
                name="checkcircle"
                size={24}
                color={Colors[colorScheme ?? "light"].primary}
              />
            </Animated.View>
          )}
          {(transaction?.status === "PROCESSING" ||
            transaction?.status === "NOT_PROCESSED") && (
            <Animated.View>
              <Progress.Circle
                size={24}
                indeterminate={true}
                textStyle={{
                  fontWeight: "bold",
                }}
                color={Colors[colorScheme ?? "light"].darkOrange}
              />
            </Animated.View>
          )}

          {(transaction?.status === StatusEnum.ERROR ||
            transaction?.status === "ERROR") && (
            <View>
              <MaterialIcons
                name="cancel"
                size={24}
                color={Colors[colorScheme ?? "light"].darkRed}
                onPress={() => {
                  storage === "SERVER" &&
                    toast.show(
                      "There is Some Issue in the Processing the Transaction. Please contact support",
                      {
                        type: "danger",
                      }
                    );
                  storage === "LOCAL" &&
                    toast.show(transaction?.error || "Error in Uploading", {
                      type: "danger",
                    });
                }}
              />
            </View>
          )}

          {(transaction?.status === StatusEnum.NOT_UPLOADED ||
            (storage === "SERVER" &&
              transaction.status !== "PROCESSING" &&
              transaction.status !== "SYNCHED" &&
              transaction.status !== "NOT_PROCESSED")) && (
            <View>
              <MaterialIcons
                name="delete-outline"
                size={24}
                color={Colors[colorScheme ?? "light"].darkRed}
                onPress={() => removeDocument(index, storage)}
              />
            </View>
          )}
        </View>
        {transaction?.status === "PROCESSED" && (
          <TouchableOpacity
            onPress={() =>
              router.navigate({
                pathname: "/verifyTransactions",
                params: { fileName: transaction?.uniqueName },
              })
            }
          >
            <Text
              style={[
                textStyles.xs,
                textStyles.mdBold,
                commonStyles.alignJustifyCenter,
                {
                  color: Colors[colorScheme ?? "light"].darkBlue,
                  textAlign: "center",
                },
              ]}
              numberOfLines={2}
            >
              Click here to verify the Transactions
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default UploadTransactionList;

const styles = StyleSheet.create({});
