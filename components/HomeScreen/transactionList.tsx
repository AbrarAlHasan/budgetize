import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { ITransaction, ITransactionV2 } from "@/types/HomeScreenTypes";
import { groupData } from "@/utils/CommonUtlis";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import { formatPrice } from "@/utils/PriceFormatter";
import log from "@/utils/Logger";
import ChipText from "../ChipText";
import { router } from "expo-router";
import { ITransactionList } from "@/types/TransactionScreenTypes";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  SlideInLeft,
  SlideOutLeft,
  SlideInUp,
  SlideOutDown,
} from "react-native-reanimated";
import BorderLine from "../BorderLine";

type TransactionType<T extends boolean> = T extends true
  ? ITransactionList
  : ITransactionV2;

interface TransactionListProps<T extends boolean> {
  transactions?: Array<TransactionType<T>>;
  onEdit?: (transactionDetails: ITransactionV2) => void;
  onDelete?: (transactionDetails: ITransactionV2) => void;
  showCategoryDetails: T;
  containerStyle?: ViewStyle;
}

const TransactionList = <T extends boolean>({
  transactions,
  onEdit,
  onDelete,
  showCategoryDetails,
  containerStyle,
}: TransactionListProps<T>) => {
  const colorScheme = useColorScheme();
  const [transactionData, setTransactionData] = useState<any>();
  const [sortedDateList, setSortedDateList] = useState<any>([]);

  const scrollY = useSharedValue(0);
  const fadeAnim = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const fadeStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(scrollY.value > 300 ? 1 : 0, { duration: 500 }),
    };
  });

  const groupTransactions = (
    transactions: Array<ITransactionV2> | undefined
  ) => {
    const groupedTransactions = transactions?.reduce(
      (acc: any, transaction) => {
        const date = new Date(transaction.date).toISOString().split("T")[0];

        // Check if the date already exists in the accumulator
        if (!acc[date]) {
          // Initialize the date with an empty array and total amount of 0
          acc[date] = {
            date: date,
            totalAmount: 0,
            transactions: [],
          };
        }

        // Add the transaction amount to the total
        acc[date].totalAmount += transaction.amount;

        // Add the transaction to the list for this date
        acc[date].transactions.push(transaction);

        return acc;
      },
      {}
    );
    return groupedTransactions;
  };

  useEffect(() => {
    // const groupedData = groupData(transactions, "date");
    const groupedData = groupTransactions(transactions);
    setTransactionData(groupedData);

    const sortedDates = Object?.keys(groupedData ?? {}).sort((dateA, dateB) => {
      return Date.parse(dateB) - Date.parse(dateA); // Sorting in descending order
    });
    setSortedDateList(sortedDates);
  }, [transactions]);

  const [showUpdateAction, setShowUpdateAction] = useState<number | null>(null);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, paddingTop: 20, ...containerStyle }}
    >
      {sortedDateList?.map((item: any, index: number) => {
        return (
          <Animated.View
            entering={FadeIn.duration(500 * (index + 1))}
            key={index}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingRight: 16,
              }}
            >
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
              {/* <Text
                style={[
                  textStyles.bolder,
                  textStyles.md,
                  {
                    paddingVertical: 5,
                    color: Colors[colorScheme ?? "light"].darkText,
                  },
                ]}
              >
                {formatPrice().format(transactionData[item]?.totalAmount)}
              </Text> */}
              <ChipText
                chipText={formatPrice().format(
                  transactionData[item]?.totalAmount
                )}
                chipTextStyle={{
                  ...textStyles?.bolder,
                  ...textStyles.sm,
                  color: Colors[colorScheme ?? "light"].darkText,
                }}
              />
            </View>

            {transactionData[item]?.transactions?.map(
              (data: TransactionType<T>, index: number) => {
                return (
                  <Animated.View
                    key={data?.id}
                    style={{
                      position: "relative",
                      justifyContent: "center",
                    }}
                  >
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
                            gap: 12,
                          }}
                        >
                          {showCategoryDetails && "category" in data ? (
                            <View
                              style={[
                                commonStyles.alignJustifyCenter,
                                {
                                  backgroundColor:
                                    data?.category?.background_color ||
                                    Colors.dark.primary,
                                  borderRadius: 100,
                                  aspectRatio: 1,
                                  height: 32,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  textStyles.sm,
                                  { paddingLeft: 3, paddingTop: 2 },
                                ]}
                              >
                                {data?.category?.icon}
                              </Text>
                            </View>
                          ) : (
                            <View
                              style={{
                                width: 10,
                                aspectRatio: 1,
                                backgroundColor:
                                  Colors[colorScheme ?? "light"].primary,
                                borderRadius: 100,
                              }}
                            />
                          )}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                textStyles.semiBold,
                                textStyles.sm,
                                {
                                  color: data?.description
                                    ? Colors[colorScheme ?? "light"].darkText
                                    : Colors[colorScheme ?? "light"].lightGray,
                                },
                              ]}
                            >
                              {data?.description || "No Description"}
                            </Text>
                            {"category" in data && (
                              <Text
                                style={[
                                  textStyles.xs,
                                  {
                                    color: Colors[colorScheme ?? "light"].gray,
                                  },
                                ]}
                              >
                                {data?.category?.category_name}
                              </Text>
                            )}
                          </View>
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
                          {onEdit &&
                            onDelete &&
                            showUpdateAction == data?.id && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  gap: 10,
                                  alignSelf: "flex-end",
                                  marginTop: 10,
                                }}
                              >
                                {onEdit && (
                                  <Pressable
                                    onPress={() => {
                                      onEdit(data);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        textStyles.bolder,
                                        {
                                          color:
                                            Colors[colorScheme ?? "light"]
                                              .darkOrange,
                                        },
                                      ]}
                                    >
                                      Edit
                                    </Text>
                                  </Pressable>
                                )}
                                {onDelete && (
                                  <Pressable
                                    onPress={() => {
                                      onDelete(data);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        textStyles.bolder,
                                        {
                                          color:
                                            Colors[colorScheme ?? "light"]
                                              .darkRed,
                                        },
                                      ]}
                                    >
                                      Delete
                                    </Text>
                                  </Pressable>
                                )}
                              </View>
                            )}
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              }
            )}
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

export default TransactionList;

const styles = StyleSheet.create({
  fadeView: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50, // Adjust the height as needed
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Adjust the color and opacity as needed,
    paddingVertical: 14,
  },
});
