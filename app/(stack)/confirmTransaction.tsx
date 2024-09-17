import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AntDesign from "@expo/vector-icons/AntDesign";
import CustomButton from "@/components/CustomButton";
import { formatPrice } from "@/utils/PriceFormatter";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import CustomTextInput from "@/components/CustomTextInput";
import BorderLine from "@/components/BorderLine";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateRangePicker from "@/components/DateRangePicker";
import { formatDateTimeTimezone } from "@/utils/DateCalculator";
import {
  getMonthlyCategoryList,
  getWeeklyCategoryList,
} from "@/api/home.action";
import { ICategory } from "@/types/HomeScreenTypes";
import Checkbox from "expo-checkbox";
import { useToast } from "react-native-toast-notifications";
import { supabase } from "@/lib/supabase";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { triggerHomeApi } from "@/redux/reducers/slice/homeSlice";

const ConfirmTransaction = () => {
  const { amount }: { amount: string } = useLocalSearchParams();

  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const dispatch = useDispatch();

  const [isDateRangeVisible, setIsDateRangeVisible] = useState(false);
  const [spentDate, setSpentDate] = useState<Date | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [description, setDescription] = useState("");

  const { weeklyCategoryList, monthlyCategoryList } = useSelector(
    (state: RootState) => state.HomeSlice
  );

  const toast = useToast();

  const confirmDateRange = (date: any) => {
    setIsDateRangeVisible(false);
    setSpentDate(new Date(date?.dateString));
  };

  const addTransaction = async () => {
    if (!selectedCategory) {
      toast.show("Please Select a Category", { type: "danger" });
      return;
    }
    const payload = {
      category_id: parseInt(selectedCategory as string),
      description: description,
      date: formatDateTimeTimezone(spentDate, "YYYY-MM-DD"),
      amount: parseFloat(amount),
    };
    const { data, error } = await supabase.from("transactions").insert(payload);
    if (error === null) {
      dispatch(triggerHomeApi());
      router.replace("/(tabs)/");
    }
  };

  return (
    <View
      style={{
        flex: 1,
        paddingTop: top,
        backgroundColor: Colors[colorScheme ?? "light"].background,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
          position: "relative",
        }}
      >
        <Pressable
          onPress={() => {
            router.back();
          }}
          style={{ position: "absolute", left: 10, zIndex: 20 }}
        >
          <AntDesign
            name="left"
            size={24}
            color={Colors[colorScheme ?? "light"].darkText}
          />
        </Pressable>
        <View style={{ flex: 2, alignItems: "center" }}>
          <Text
            style={[
              textStyles.bolder,
              textStyles.lg,
              { color: Colors[colorScheme ?? "light"].darkText },
            ]}
          >
            {formatPrice().format(parseFloat(amount ?? 0))}
          </Text>
        </View>
        <View style={{ position: "absolute", right: 10 }}>
          <CustomButton
            label="Spend"
            colorType="primary"
            onPress={addTransaction}
            customStyle={{
              borderRadius: 25,
              padding: 5,
              paddingHorizontal: 10,
            }}
          />
        </View>
      </View>

      <BorderLine />
      <View
        style={[
          commonStyles.alignJustifyCenter,
          { flexDirection: "row", paddingHorizontal: 24, paddingVertical: 14 },
        ]}
      >
        <Text
          style={[
            textStyles.bolder,
            textStyles.sm,
            {
              paddingRight: 20,
              width: 64,
              color: Colors[colorScheme ?? "light"].darkText,
            },
          ]}
        >
          For
        </Text>
        <TextInput
          value={description}
          placeholder="What did you Spend For"
          style={{ flex: 1 }}
          onChangeText={setDescription}
        />
      </View>
      <View
        style={[
          commonStyles.alignJustifyCenter,
          { flexDirection: "row", paddingHorizontal: 24, paddingVertical: 14 },
        ]}
      >
        <Text
          style={[
            textStyles.bolder,
            textStyles.sm,
            {
              paddingRight: 20,
              width: 64,
              color: Colors[colorScheme ?? "light"].darkText,
            },
          ]}
        >
          Date
        </Text>
        <Pressable
          style={[
            {
              paddingRight: 20,
              flex: 1,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
            },
          ]}
          onPress={() => {
            setIsDateRangeVisible(true);
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={Colors[colorScheme ?? "light"].gray}
          />
          <Text
            style={[
              textStyles?.sm,
              textStyles?.mdBold,
              { color: Colors[colorScheme ?? "light"]?.gray },
            ]}
          >
            {spentDate
              ? formatDateTimeTimezone(spentDate, "MMM DD,YYYY (ddd)")
              : "Today"}
          </Text>
        </Pressable>
      </View>
      <BorderLine />
      <ScrollView bounces={false}>
        <View
          style={[
            {
              backgroundColor: Colors[colorScheme ?? "light"].lightText,
              padding: 10,
            },
          ]}
        >
          <Text
            style={[
              textStyles.bolder,
              textStyles.sm,
              {
                paddingLeft: 3,
                paddingTop: 2,
                color: Colors[colorScheme ?? "light"].darkText,
              },
            ]}
          >
            Weekly Categories
          </Text>
        </View>
        <View>
          {weeklyCategoryList?.map((data: ICategory) => {
            return (
              <View
                key={data?.category_id}
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    gap: 10,
                  },
                ]}
              >
                <CategoryList
                  data={data}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                />
              </View>
            );
          })}
        </View>
        <View
          style={[
            {
              backgroundColor: Colors[colorScheme ?? "light"].lightText,
              padding: 10,
            },
          ]}
        >
          <Text
            style={[
              textStyles.bolder,
              textStyles.sm,
              {
                paddingLeft: 3,
                paddingTop: 2,
                color: Colors[colorScheme ?? "light"].darkText,
              },
            ]}
          >
            Monthly Categories
          </Text>
        </View>
        <View>
          {monthlyCategoryList?.map((data: ICategory) => {
            return (
              <View
                key={data?.category_id}
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    gap: 10,
                  },
                ]}
              >
                <CategoryList
                  data={data}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <DateRangePicker
        isVisible={isDateRangeVisible}
        onCancel={() => setIsDateRangeVisible(false)}
        mode="single"
        onConfirm={confirmDateRange}
      />
    </View>
  );
};

export default ConfirmTransaction;

const CategoryList = ({
  data,
  selectedCategory,
  setSelectedCategory,
}: {
  data: ICategory;
  selectedCategory: string | null;
  setSelectedCategory: (value: string) => void;
}) => {
  const colorScheme = useColorScheme();
  return (
    <>
      <Pressable
        onPress={() => {
          setSelectedCategory(data?.category_id.toString());
        }}
        style={[commonStyles.alignJustifyCenter, { flexDirection: "row" }]}
      >
        <View
          style={[
            commonStyles.alignJustifyCenter,
            {
              backgroundColor: data?.background_color || Colors.dark.primary,
              borderRadius: 100,
              aspectRatio: 1,
              height: 40,
            },
          ]}
        >
          <Text style={[textStyles.xl, { paddingLeft: 3, paddingTop: 2 }]}>
            {data?.icon}
          </Text>
        </View>
        <Text
          style={[
            textStyles.bolder,
            textStyles.sm,
            {
              flex: 1,
              marginLeft: 20,
              color: Colors[colorScheme ?? "light"].darkText,
            },
          ]}
        >
          {data?.category_name}
        </Text>
        <Checkbox
          style={{ margin: 8, borderRadius: 100, width: 20, aspectRatio: 1 }}
          value={data?.category_id.toString() == selectedCategory}
          onValueChange={() => {
            setSelectedCategory(data?.category_id.toString());
          }}
          color={
            data?.category_id.toString() == selectedCategory
              ? Colors[colorScheme ?? "light"].primary
              : undefined
          }
        />
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({});
