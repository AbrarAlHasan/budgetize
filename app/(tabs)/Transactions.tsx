import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { header, textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import ComingSoon from "@/components/ComingSoon";
import ComingSoonTransaction from "@/components/Transactions/ComingSoonTransaction";
import DateRangePicker from "@/components/DateRangePicker";
import {
  formatDateTimeTimezone,
  getCurrentMonthRange,
  getCurrentWeekRange,
} from "@/utils/DateCalculator";
import { DateRange } from "@/types/GeneralTypes";
import { getTransactionList } from "@/api/transaction.action";
import {
  disableLoading,
  enableLoading,
} from "@/redux/reducers/slice/globalSlice";
import { useDispatch } from "react-redux";
import { ITransactionList } from "@/types/TransactionScreenTypes";
import TransactionList from "@/components/HomeScreen/transactionList";
import { useFocusEffect } from "expo-router";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import { ThemedText } from "@/components/ThemedText";
import BorderLine from "@/components/BorderLine";

const Transactions = () => {
  const colorScheme = useColorScheme();
  const dispatch = useDispatch();

  const [selectedDateRange, setSelectedDateRange] = useState(
    getCurrentMonthRange(new Date())
  );
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);
  const [transactionList, setTransactionList] = useState<ITransactionList[]>(
    []
  );

  useEffect(() => {
    fetchTransactionList(getCurrentMonthRange(new Date()));
  }, []);

  const confirmDate = (date: any) => {
    const dateRange = getCurrentMonthRange(date?.startDateString);
    setSelectedDateRange(dateRange);
    setIsDateSelectorOpen(false);
    fetchTransactionList(dateRange);
  };

  const fetchTransactionList = async (dateRange: DateRange) => {
    dispatch(enableLoading());
    const transactionResponse = await getTransactionList(dateRange);
    if (transactionResponse?.error === null) {
      setTransactionList(transactionResponse?.response as any);
    }
    dispatch(disableLoading());
  };
  return (
    <SafeAreaWrapper style={{ paddingBottom: 0, paddingHorizontal: 20 }}>
      <>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingTop: 20,
          }}
        >
          <ThemedText
            style={[
              header.headerText,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
            type="defaultSemiBold"
          >
            Transactions
          </ThemedText>
          <View
            style={{
              backgroundColor: Colors[colorScheme ?? "light"].background,
            }}
          >
            <Pressable
              onPress={() => {
                setIsDateSelectorOpen(true);
              }}
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  justifyContent: "center",
                  marginBottom: 20,
                  position: "relative",
                },
              ]}
            >
              <Text
                style={[
                  textStyles.semiBold,
                  textStyles.md,
                  { color: Colors[colorScheme ?? "light"].primary },
                ]}
              >
                {formatDateTimeTimezone(
                  selectedDateRange?.fromDate,
                  "MMMM YYYY"
                )}
              </Text>
            </Pressable>
          </View>
        </View>
        <TransactionList
          transactions={transactionList}
          showCategoryDetails={true}
          containerStyle={{ paddingTop: 0 }}
        />

        {isDateSelectorOpen && (
          <DateRangePicker
            isVisible={isDateSelectorOpen}
            onCancel={() => setIsDateSelectorOpen(false)}
            mode="range"
            dateRange={selectedDateRange}
            onKeyPressType="MONTH"
            enableShortcut={false}
            onConfirm={confirmDate}
          />
        )}
        {/* <ComingSoon renderBackground={() => <ComingSoonTransaction />} /> */}
      </>
    </SafeAreaWrapper>
  );
};

export default Transactions;

const styles = StyleSheet.create({});
