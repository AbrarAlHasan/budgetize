import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import SafeAreaWrapper from "@/components/SafeAreaWrapper";
import LottieView from "lottie-react-native";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import CustomButton from "@/components/CustomButton";
import { textStyles } from "@/stylings/CustomStyles";
import { Colors } from "@/constants/Colors";
import { useLocalSearchParams } from "expo-router";
import { nativeApplicationVersion } from "expo-application";

const UpdateApp = () => {
  const routeParams = useLocalSearchParams();
  console.log(routeParams);
  const colorScheme = useColorScheme();

  const updateApplication = async () => {
    if (await Linking.canOpenURL(routeParams?.downloadLink as string)) {
      Linking.openURL(routeParams?.downloadLink as string);
    }
  };
  return (
    <SafeAreaWrapper style={{ paddingHorizontal: 20 }}>
      <>
        <View
          style={{ alignItems: "center", flex: 1, justifyContent: "center" }}
        >
          <Text
            style={[
              textStyles.bolder,
              textStyles.sm,
              {
                textAlign: "center",
                letterSpacing: 2,
                color: Colors[colorScheme ?? "light"].primary,
              },
            ]}
          >
            Your budget deserves the best! Get the latest improvements by
            updating your app
          </Text>
          <Text
            style={[
              textStyles.bolder,
              textStyles.sm,
              {
                textAlign: "center",
                letterSpacing: 2,
                color: Colors[colorScheme ?? "light"].darkRed,
              },
            ]}
          >
            {nativeApplicationVersion + " -> " + routeParams?.version}
          </Text>
          {Platform.OS === "web" ? (
            <DotLottieReact
              autoplay={true}
              style={{
                width: 300,
                height: 300,
              }}
              src={"../assets/gifs/Update.json"}
              loop={true}
            />
          ) : (
            <LottieView
              autoPlay
              style={{
                width: 300,
                height: 300,
              }}
              source={require("@/assets/gifs/Update.json")}
            />
          )}
        </View>
        <View style={{ width: "100%" }}>
          <CustomButton
            colorType="primary"
            label="Update App"
            onPress={() => {
              updateApplication();
            }}
          />
        </View>
      </>
    </SafeAreaWrapper>
  );
};

export default UpdateApp;

const styles = StyleSheet.create({});
