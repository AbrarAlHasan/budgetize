import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import EmojiModal from "react-native-emoji-modal";
import CustomTextInput from "@/components/CustomTextInput";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useToast } from "react-native-toast-notifications";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";

const COLOR_LIST = [
  "#FF0000",
  "#FF69B4",
  "#FF00FF",
  "#800080",
  "#0000FF",
  "#00FFFF",
  "#008000",
  "#008080",
  "#00FF00",
  "#FFFF00",
  "#FFA500",
  "#FF0000",
  "#BDB76B",
  "#A52A2A",
  "#000080",
  "#000000",
  "#990000",
  "#FF66FF",
  "#993366",
  "#660066",
];

const AddCategory = () => {
  const { top } = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const toast = useToast();
  const { categoryId } = useLocalSearchParams();

  const authSlice = useSelector((state: RootState) => state.AuthSlice);

  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [icon, setIcon] = useState("👻");
  const [categoryType, setCategoryType] = useState("WEEKLY");
  const [categoryName, setCategoryName] = useState("");
  const [categoryAmount, setCategoryAmount] = useState("");

  const colorPosition = useSharedValue(0);
  const previousColorPosition = useSharedValue(0);
  const newColorPosition = useSharedValue(0);

  // const animatedStyle = useAnimatedStyle(() => {
  //   return {
  //     backgroundColor: interpolateColor(
  //       colorPosition.value,
  //       [0, 1],
  //       [
  //         COLOR_LIST[previousColorPosition.value],
  //         COLOR_LIST[newColorPosition.value],
  //       ]
  //     ),
  //   };
  // });

  useEffect(() => {}, []);

  // const changeColor = (index: number) => {
  //   previousColorPosition.value = newColorPosition.value;
  //   newColorPosition.value = index;
  //   colorPosition.value = withTiming(index, { duration: 1000 });
  // };

  const changeColor = (color: string) => {
    setBackgroundColor(color);
  };

  const validate = () => {
    if (!categoryName.trim()) {
      toast.show("Please Enter Category Name", {
        type: "danger",
        duration: 1000,
      });
      return false;
    }

    return true;
  };

  const onCreate = async () => {
    if (validate()) {
      const payload = {
        type: categoryType,
        user_id: authSlice?.userDetails?.user_id,
        background_color: backgroundColor,
        icon: icon,
        category_name: categoryName,
        amount_allocated: categoryAmount,
      };

      const response = await supabase.from("category").insert(payload);
      if (response.error === null) {
        router.back();
      }
    }
  };

  return (
    <TouchableWithoutFeedback
      style={{ zIndex: 1 }}
      onPress={() => {
        Keyboard.dismiss();
        if (isEmojiPickerOpen) {
          setIsEmojiPickerOpen(false);
        }
      }}
    >
      <View
        style={[
          {
            paddingTop: top,
            flex: 1,
            alignItems: "center",
            paddingHorizontal: 20,
            backgroundColor: Colors[colorScheme ?? "light"].background,
            position: "relative",
          },
        ]}
      >
        {isEmojiPickerOpen && (
          <View
            style={{
              position: "absolute",
              aspectRatio: 1,
              top: "30%",
              zIndex: 2,
            }}
          >
            <EmojiModal
              backgroundStyle={{
                backgroundColor: "transparent",
              }}
              onEmojiSelected={(emoji) => {
                setIcon(emoji as string);
                setIsEmojiPickerOpen(false);
              }}
              onPressOutside={() => {
                console.log("TRIGG");
                setIsEmojiPickerOpen(false);
              }}
            />
          </View>
        )}
        <View
          style={[
            commonStyles.alignJustifyBetween,
            {
              flexDirection: "row",
              marginTop: 10,
              width: "100%",
            },
          ]}
        >
          <Pressable style={{ padding: 10 }} onPress={() => router.back()}>
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme ?? "light"].darkText}
            />
          </Pressable>
          <Pressable onPress={onCreate}>
            <Text
              style={[
                textStyles.semiBold,
                textStyles.md,
                { color: Colors[colorScheme ?? "light"].primary },
              ]}
            >
              Create
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[commonStyles.alignJustifyCenter]}
          style={[{ width: "100%" }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEnabled={!isEmojiPickerOpen}
        >
          <Pressable
            onPress={() => {
              setIsEmojiPickerOpen((prevState) => !prevState);
            }}
            style={[
              commonStyles.alignJustifyCenter,
              {
                backgroundColor: backgroundColor,
                width: 100,
                aspectRatio: 1,
                borderRadius: 100,
                margin: 20,
                position: "relative",
                zIndex: 1,
              },
              // animatedStyle,
            ]}
          >
            <Text style={[{ fontSize: 45 }]}>{icon}</Text>
            <View
              style={[
                commonStyles.alignJustifyCenter,
                {
                  backgroundColor: Colors[colorScheme ?? "light"].background,
                  borderRadius: 100,
                  padding: 10,
                  position: "absolute",
                  right: -5,
                  bottom: -5,
                  shadowColor: Colors[colorScheme ?? "light"].darkText,
                  shadowRadius: 100,
                  shadowOffset: { height: 30, width: 30 },
                  shadowOpacity: 1,
                },
              ]}
            >
              <Ionicons
                name="pencil"
                size={16}
                color={Colors[colorScheme ?? "light"].gray}
              />
            </View>
          </Pressable>

          <CustomTextInput
            label="Category Name"
            placeholder="Category Name"
            onChangeText={setCategoryName}
            value={categoryName}
          />

          <View style={{ marginVertical: 20, flexDirection: "row", gap: 20 }}>
            <View style={{ flex: 1 }}>
              <CustomTextInput
                label="Amount Allocated"
                placeholder="₹"
                onChangeText={setCategoryAmount}
                value={categoryAmount}
              />
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              <Pressable
                onPress={() => {
                  setCategoryType("WEEKLY");
                }}
                style={[
                  commonStyles.alignJustifyCenter,
                  {
                    flex: 1,
                    backgroundColor:
                      categoryType === "WEEKLY"
                        ? Colors[colorScheme ?? "light"].primary
                        : Colors[colorScheme ?? "light"].lightGray,
                    borderRadius: 10,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.bolder,
                    textStyles.md,
                    {
                      color:
                        categoryType === "WEEKLY"
                          ? Colors[colorScheme ?? "light"].lightText
                          : Colors[colorScheme ?? "light"].darkText,
                    },
                  ]}
                >
                  Weekly
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCategoryType("MONTHLY");
                }}
                style={[
                  commonStyles.alignJustifyCenter,
                  {
                    flex: 1,
                    backgroundColor:
                      categoryType === "MONTHLY"
                        ? Colors[colorScheme ?? "light"].primary
                        : Colors[colorScheme ?? "light"].lightGray,
                    borderRadius: 10,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.bolder,
                    textStyles.md,
                    {
                      color:
                        categoryType === "MONTHLY"
                          ? Colors[colorScheme ?? "light"].lightText
                          : Colors[colorScheme ?? "light"].darkText,
                    },
                  ]}
                >
                  Monthly
                </Text>
              </Pressable>
            </View>
          </View>

          {/* COLOR LIST */}
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 31,
              marginVertical: 32,
              justifyContent: "center",
            }}
          >
            {COLOR_LIST?.map((data: string, index: number) => {
              return (
                <Pressable
                  key={index}
                  onPress={() => changeColor(data)}
                  style={{
                    backgroundColor: data,
                    borderRadius: 100,
                    width: "13%",
                    aspectRatio: 1,
                  }}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default AddCategory;

const styles = StyleSheet.create({});
