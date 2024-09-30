import {
  Pressable,
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

  const [showUpdateAction, setShowUpdateAction] = useState<string | null>(null);

  return (
    <ScrollView style={{ flex: 1, paddingTop: 20 }}>
      {sortedDateList?.map((item: any, index: number) => {
        return (
          <View key={index} style={{ paddingVertical: 14 }}>
            <Text
              style={[
                textStyles.bolder,
                textStyles.md,
                {
                  paddingVertical: 5,
                  color: Colors[colorScheme ?? "light"].darkText,
                },
              ]}
            >
              {formatDateTimeTimezone(item, "DD MMMM")}
            </Text>

            {transactionData[item]?.map((data: ITransaction, index: number) => {
              return (
                <Pressable
                  onPress={() => {
                    setShowUpdateAction((prevState) =>
                      prevState ? null : data?.id
                    );
                  }}
                >
                  <View
                    key={index}
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
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 10,
                          aspectRatio: 1,
                          backgroundColor:
                            Colors[colorScheme ?? "light"].primary,
                          borderRadius: 100,
                        }}
                      />
                      <Text
                        style={[
                          textStyles.semiBold,
                          textStyles.sm,
                          {
                            flex: 1,
                            color: data?.description
                              ? Colors[colorScheme ?? "light"].darkText
                              : Colors[colorScheme ?? "light"].lightGray,
                          },
                        ]}
                      >
                        {data?.description || "No Description"}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          textStyles.bolder,
                          textStyles.md,
                          { color: Colors[colorScheme ?? "light"].gray },
                        ]}
                      >
                        {formatPrice().format(data?.amount)}
                      </Text>
                      {showUpdateAction == data?.id && (
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 10,
                            alignSelf: "flex-end",
                            marginTop: 10,
                          }}
                        >
                          <Text
                            style={[
                              textStyles.bolder,
                              {
                                color:
                                  Colors[colorScheme ?? "light"].darkOrange,
                              },
                            ]}
                          >
                            Edit
                          </Text>
                          <Text
                            style={[
                              textStyles.bolder,
                              { color: Colors[colorScheme ?? "light"].darkRed },
                            ]}
                          >
                            Delete
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
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
