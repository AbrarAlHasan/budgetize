import {
  Pressable,
  ScrollView,
  SectionList,
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
import { TouchableOpacity } from "react-native-gesture-handler";

type TransactionType<T extends boolean> = T extends true
  ? ITransactionList
  : ITransactionV2;

type SectionTransactionListType = {
  title: string;
  data: ITransactionList[];
};

interface TransactionListProps<T extends boolean> {
  transactions?: Array<TransactionType<T>>;
  onEdit?: (transactionDetails: ITransactionV2) => void;
  onDelete?: (transactionDetails: ITransactionV2) => void;
  showCategoryDetails: T;
  containerStyle?: ViewStyle;
  openEditDeleteSheet?: () => void;
  setSelectedTransaction?: (transaction: ITransactionV2) => void;
}

const TransactionList = <T extends boolean>({
  transactions,
  onEdit,
  onDelete,
  showCategoryDetails,
  containerStyle,
  openEditDeleteSheet,
  setSelectedTransaction,
}: TransactionListProps<T>) => {
  const colorScheme = useColorScheme();
  const [transactionData, setTransactionData] = useState<any>();
  const [sortedDateList, setSortedDateList] = useState<any>([]);

  const [sectionTransactionList, setSectionTransactionList] = useState<
    Array<SectionTransactionListType>
  >([]);

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

    const groupedDataSectionList = groupData(transactions, "date");

    const sectionListArray: Array<SectionTransactionListType> = [];
    Object.keys(groupedDataSectionList).forEach((key) => {
      sectionListArray.push({
        title: key,
        data: groupedDataSectionList[key],
      });
    });
    setSectionTransactionList(sectionListArray);
    const sortedDates = Object?.keys(groupedData ?? {}).sort((dateA, dateB) => {
      return Date.parse(dateB) - Date.parse(dateA); // Sorting in descending order
    });
    setSortedDateList(sortedDates);
  }, [transactions]);

  const [showUpdateAction, setShowUpdateAction] = useState<number | null>(null);

  const TransactionCard = ({ item }: { item: ITransactionList }) => {
    return (
      <Animated.View
        entering={FadeIn}
        style={[
          {
            flexDirection: "row",
            paddingVertical: 10,
            backgroundColor: Colors[colorScheme ?? "light"].background,
            justifyContent: "space-between",
          },
        ]}
      >
        <View
          style={{
            backgroundColor: item?.category?.background_color,
            width: 40,
            aspectRatio: 1,
            borderRadius: 100,
            marginRight: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={textStyles.md}>{item?.category?.icon}</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            flex: 1,
          }}
        >
          <View>
            <Text
              style={[
                textStyles.sm,
                { color: Colors[colorScheme ?? "light"].darkText },
              ]}
            >
              {item.description}
            </Text>

            <TouchableOpacity
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
                {item?.category?.category_name}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text
          style={[
            textStyles.bolder,
            textStyles.lg,
            { color: Colors[colorScheme ?? "light"].darkOrange },
          ]}
          numberOfLines={2}
        >
          ₹ {item.amount}
        </Text>
      </Animated.View>
    );
  };

  const TransactionHeader = ({
    section,
  }: {
    section: SectionTransactionListType;
  }) => {
    const totalAmount = section?.data?.reduce(
      (acc, curr) => acc + curr.amount,
      0
    );

    return (
      <Animated.View
        entering={FadeIn}
        style={{
          paddingVertical: 10,
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
    <>
      <SectionList
        sections={sectionTransactionList}
        keyExtractor={(item, index) => index.toString()}
        renderSectionHeader={TransactionHeader}
        renderItem={TransactionCard}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={10}
      />
    </>
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
