import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { ITransaction } from "@/types/HomeScreenTypes";
import { groupData } from "@/utils/CommonUtlis";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import { formatPrice } from "@/utils/PriceFormatter";

const TransactionList = ({
  transactions = [],
}: {
  transactions?: ITransaction[];
}) => {
  const colorScheme = useColorScheme();
  const [transactionData, setTransactionData] = useState<any>();
  const [sortedDateList, setSortedDateList] = useState<any>([]);
  useEffect(() => {
    const groupedData = groupData(transactions, "date");
    setTransactionData(groupedData);

    const sortedDates = Object.keys(groupedData).sort((dateA, dateB) => {
      return new Date(dateB) - new Date(dateA); // Sorting in descending order
    });
    setSortedDateList(sortedDates);
  }, [transactions]);

  return (
    <ScrollView style={{ flex: 1, paddingTop: 20 }}>
      {sortedDateList?.map((item) => {
        return (
          <View style={{ paddingVertical: 14 }}>
            <Text
              style={[textStyles.bolder, textStyles.md, { paddingVertical: 5 }]}
            >
              {formatDateTimeTimezone(item, "DD MMMM")}
            </Text>
            {transactionData[item]?.map((data: ITransaction) => {
              return (
                <View
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      aspectRatio: 1,
                      backgroundColor: Colors[colorScheme ?? "light"].primary,
                      borderRadius: 100,
                    }}
                  />
                  <Text
                    style={[textStyles.semiBold, textStyles.sm, { flex: 1 }]}
                  >
                    {data?.description}
                  </Text>
                  <Text
                    style={[
                      textStyles.bolder,
                      textStyles.md,
                      { color: Colors[colorScheme ?? "light"].gray },
                    ]}
                  >
                    {formatPrice().format(data?.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default TransactionList;

const styles = StyleSheet.create({});
