import {
  Appearance,
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { supabase } from "@/lib/supabase";
import { IProcessedTransaction } from "@/types/TransactionScreenTypes";
import { groupData } from "@/utils/CommonUtlis";
import FeatherIcon from "@expo/vector-icons/Feather";
import MaterialIcon from "@expo/vector-icons/MaterialIcons";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "@/components/BottomSheet";
import ChipText from "@/components/ChipText";
import Animated, { FadeIn } from "react-native-reanimated";
import { useToast } from "react-native-toast-notifications";
import CustomButton from "@/components/CustomButton";
import { AntDesign } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import EditDeleteBottomSheet from "@/components/EditDeleteBottomSheet";

type ProcessedTransactionType = {
  title: string;
  data: IProcessedTransaction[];
};

const VerifyTransactions = () => {
  const colorScheme = useColorScheme();
  const routeParams = useLocalSearchParams();
  const toast = useToast();
  const AuthDetails = useSelector((state: RootState) => state.AuthSlice);

  const [processedTransactions, setProcessedTransactions] = React.useState<
    ProcessedTransactionType[]
  >([]);

  const [selectedTransaction, setSelectedTransaction] =
    useState<IProcessedTransaction>();

  const [enableSync, setEnableSync] = useState<boolean>(false);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  const editBottomSheetModalRef = useRef<BottomSheetModal>(null);

  const syncTransactionConfirmationModalRef = useRef<BottomSheetModal>(null);

  const handlePresentModalPress = useCallback(
    (type: "CATEGORY" | "EDIT" | "SYNC_TRANSACTION") => {
      if (type === "CATEGORY") bottomSheetModalRef.current?.present();
      if (type === "EDIT") editBottomSheetModalRef.current?.present();
      if (type === "SYNC_TRANSACTION")
        syncTransactionConfirmationModalRef.current?.present();
    },
    []
  );

  const handleCloseModalPress = useCallback(() => {
    bottomSheetModalRef.current?.close();
    editBottomSheetModalRef.current?.close();
    syncTransactionConfirmationModalRef.current?.close();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProcessedTransactions();
      fetchFileStatus();
    }, [])
  );

  const fetchFileStatus = async () => {
    const response = await supabase
      .from("files_for_processing_transactions")
      .select("*")
      .eq("uniqueName", routeParams?.fileName)
      .maybeSingle();

    if (response?.error === null) {
      setEnableSync(response?.data?.status === "SYNCHED" ? false : true);
    }
  };

  const deleteTransaction = async () => {
    const deleteResponse = await supabase
      .from("processed_transactions")
      .delete()
      .eq("id", selectedTransaction?.id);
    console.log(deleteResponse);
    handleCloseModalPress();

    if (deleteResponse.error === null) {
      fetchProcessedTransactions();
      return;
    }

    toast.show("Error Deleting Transaction");
  };

  const editTransaction = (
    type?: string,
    selectedTransactionProp?: IProcessedTransaction
  ) => {
    if (!selectedTransaction && !selectedTransactionProp) return;
    const transaction = selectedTransactionProp || selectedTransaction;
    const navigationPayload = {
      from: "IMPORTED_TRANSACTION",
      type: "EDIT_TRANSACTION",
      ...transaction,
      category_id: transaction?.category_id?.category_id,
      category_name: transaction?.category_id?.category_name,
    };
    console.log(type);
    if (type == "SELECT_CATEGORY") {
      router.push({
        pathname: "/confirmTransaction",
        params: navigationPayload,
      });
      return;
    }
    router.push({
      pathname: "/addTransaction",
      params: navigationPayload,
    });
    handleCloseModalPress();
  };

  const fetchProcessedTransactions = async () => {
    try {
      const response = await supabase
        .from("processed_transactions")
        .select("* ,category_id(*)")
        .eq("file_name", routeParams?.fileName)
        .order("transaction_date", { ascending: false });

      if (response?.error === null) {
        const groupedValue = groupData(
          response?.data as IProcessedTransaction[],
          "date"
        );

        const sectionListArray: Array<ProcessedTransactionType> = [];
        Object.keys(groupedValue).forEach((key) => {
          sectionListArray.push({
            title: key,
            data: groupedValue[key],
          });
        });
        setProcessedTransactions(sectionListArray);
      }
    } catch (error) {}
  };

  const syncTransaction = async () => {
    try {
      console.log({
        userId: AuthDetails.userDetails?.user_id,
        fileName: routeParams?.fileName,
      });
      const response = supabase.functions.invoke("sync-transaction", {
        body: {
          userId: AuthDetails.userDetails?.user_id,
          fileName: routeParams?.fileName,
        },
      });

      handleCloseModalPress();
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.log("Error Invoking Supabase Function");
    }
  };

  const TransactionCard = ({ item }: { item: IProcessedTransaction }) => {
    return (
      <Animated.View
        entering={FadeIn}
        style={[
          {
            flexDirection: "row",
            padding: 10,
            backgroundColor: Colors[colorScheme ?? "light"].background,
            justifyContent: "space-between",
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            width: "75%",
          }}
        >
          {!item?.synced && (
            <TouchableOpacity
              onPress={() => {
                handlePresentModalPress("EDIT");
                setSelectedTransaction(item);
              }}
            >
              <FeatherIcon
                name="edit-3"
                size={16}
                color={Colors[colorScheme ?? "light"].darkRed}
                style={{ paddingTop: 2 }}
              />
            </TouchableOpacity>
          )}
          <View>
            <Text
              style={[
                textStyles.sm,
                { color: Colors[colorScheme ?? "light"].darkText },
              ]}
            >
              {item.description}
            </Text>
            <Text
              style={[
                textStyles.xxs,
                textStyles.mdBold,
                { color: Colors[colorScheme ?? "light"].darkText },
              ]}
            >
              {formatDateTimeTimezone(item?.transaction_date, "hh:mm A")}
            </Text>
            <TouchableOpacity
              disabled={item?.category_id ? true : false}
              onPress={() => editTransaction("SELECT_CATEGORY", item)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Text
                style={[
                  textStyles.xs,
                  {
                    color:
                      Colors[colorScheme ?? "light"][
                        item?.category_id ? "gray" : "darkOrange"
                      ],
                  },
                ]}
              >
                {item?.category_id
                  ? `${
                      item?.category_id?.category_name
                    }-${item?.category_type?.toLocaleLowerCase()}`
                  : "Select Category"}
              </Text>
              {item?.synced && (
                <Text
                  style={[
                    textStyles.xs,
                    textStyles.bolder,
                    {
                      color: Colors[colorScheme ?? "light"].primary,
                    },
                  ]}
                >
                  Synced
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Text
          style={[
            textStyles.bolder,
            textStyles.lg,
            { color: Colors[colorScheme ?? "light"].darkOrange },
          ]}
        >
          ₹ {item.amount}
        </Text>
      </Animated.View>
    );
  };

  const TransactionHeader = ({
    section,
  }: {
    section: ProcessedTransactionType;
  }) => {
    const totalAmount = section?.data?.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );

    return (
      <Animated.View
        entering={FadeIn}
        style={{
          borderBottomColor: Colors[colorScheme ?? "light"].lightGray,
          borderBottomWidth: 1,
          padding: 10,
          backgroundColor: Colors[colorScheme ?? "light"].background,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={[
            textStyles.bolder,
            textStyles.lg,
            { color: Colors[colorScheme ?? "light"].darkText },
          ]}
        >
          {formatDateTimeTimezone(new Date(section?.title), "DD MMM YYYY")}
        </Text>

        <ChipText
          chipText={`₹ ${totalAmount}`}
          chipTextStyle={{ ...textStyles.sm }}
          chipViewStyle={{
            paddingVertical: 4,
            width: "auto",
            height: "auto",
            borderRadius: 20,
          }}
        />
      </Animated.View>
    );
  };
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].background,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          padding: 10,
        }}
      >
        <View>
          <Text
            style={[
              textStyles.bolder,
              textStyles.lg,
              {
                color: Colors[colorScheme ?? "light"].darkText,
              },
            ]}
          >
            Imported Transactions
          </Text>
          {!enableSync && (
            <Text
              style={[
                textStyles.xxs,
                {
                  color: Colors[colorScheme ?? "light"].primary,
                  textAlign: "center",
                },
              ]}
            >
              All Datas in this Report has been Synced
            </Text>
          )}
        </View>
        {processedTransactions?.length > 0 && enableSync && (
          <ChipText
            chipText={`Sync Transactions`}
            chipTextStyle={{ ...textStyles.xs }}
            chipViewStyle={{
              paddingVertical: 4,
              width: "auto",
              height: "auto",
              borderRadius: 20,
            }}
            onPress={() => handlePresentModalPress("SYNC_TRANSACTION")}
          />
        )}
      </View>
      <SectionList
        sections={processedTransactions}
        keyExtractor={(item, index) => index.toString()}
        renderSectionHeader={TransactionHeader}
        renderItem={TransactionCard}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
      />

      {/* Category Modal Sheet */}
      <BottomSheet
        bottomSheetModalRef={bottomSheetModalRef}
        index={3}
        onClose={handleCloseModalPress}
      >
        <Text
          style={[
            textStyles.sm,
            {
              color: Colors[colorScheme ?? "light"].darkText,
              textAlign: "center",
            },
          ]}
        >
          Please select the Category for which the Transaction should be
          allocated
        </Text>
      </BottomSheet>
      {/* Edit Modal Sheet */}

      <EditDeleteBottomSheet
        deleteTransaction={deleteTransaction}
        editBottomSheetModalRef={editBottomSheetModalRef}
        editTransaction={editTransaction}
        handleCloseModalPress={handleCloseModalPress}
      />

      <BottomSheet
        bottomSheetModalRef={syncTransactionConfirmationModalRef}
        onClose={handleCloseModalPress}
        snapPoints={["1%", "30%"]}
        index={1}
      >
        <View
          style={[
            commonStyles.alignJustifyBetween,
            { flex: 1, paddingBottom: 32 },
          ]}
        >
          <AntDesign
            name="warning"
            size={32}
            color={Colors[colorScheme ?? "light"].darkOrange}
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
            If Category Not Selected will fail to Sync Transaction
          </Text>
          <View style={[{ width: "100%" }]}>
            <CustomButton
              label="Confirm"
              colorType="primary"
              onPress={syncTransaction}
            />
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

export default VerifyTransactions;

const styles = StyleSheet.create({});
