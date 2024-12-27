import {
  Appearance,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Colors } from "@/constants/Colors";
import { commonStyles, textStyles } from "@/stylings/CustomStyles";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AntIcon from "@expo/vector-icons/AntDesign";
import * as DocumentPicker from "expo-document-picker";
import CustomButton from "@/components/CustomButton";
import { Image } from "expo-image";
import NoFiles from "@/assets/images/noFiles.png";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutLeft,
  FadeOutUp,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";
import { Upload } from "tus-js-client";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import * as Progress from "react-native-progress";
import { useToast } from "react-native-toast-notifications";

const UploadTransaction = () => {
  const colorScheme = useColorScheme();
  const toast = useToast();

  const auth = useSelector((state: RootState) => state.AuthSlice);

  const [selectedDocuments, setSelectedDocuments] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);

  const [selectedDocumetsUploadStatus, setSelectedDocumetsUploadStatus] =
    useState<
      {
        status: "NOT_UPLOADED" | "UPLOADING" | "UPLOADED" | "ERROR";
        uploadingStatus: number;
        error?: string;
      }[]
    >([]);

  useEffect(() => {
    Appearance.setColorScheme("light");
  }, []);

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true, // Allows the user to select any file
        // type: [
        //   "text/csv",
        //   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        //   "application/vnd.ms-excel",
        // ],
      });
      if (!result.canceled) {
        const successResult =
          result as DocumentPicker.DocumentPickerSuccessResult;
        const appendedDocuments = [
          ...selectedDocuments,
          ...successResult.assets,
        ];
        setSelectedDocuments(appendedDocuments);

        setSelectedDocumetsUploadStatus(
          Array.from({ length: appendedDocuments?.length }, () => ({
            status: "NOT_UPLOADED",
            uploadingStatus: 0,
          }))
        );
      } else {
      }
    } catch (error) {}
  };

  const getFileExtension = (uri: string): string => {
    const match = /\.([a-zA-Z]+)$/.exec(uri);
    if (match !== null) {
      return match[1];
    }

    return "";
  };

  const getMimeType = (extension: string): string => {
    if (extension === "jpg") return "image/jpeg";
    return `image/${extension}`;
  };

  const removeDocument = (index: number) => {
    setSelectedDocuments((prevSelectedDocuments) =>
      prevSelectedDocuments.filter((_, i) => {
        i !== index;
      })
    );

    setSelectedDocumetsUploadStatus((prevState) =>
      prevState.filter((_, i) => {
        i !== index;
      })
    );
  };

  const uploadFiles = async (
    bucketName: string,
    pickerResult: DocumentPicker.DocumentPickerAsset[]
  ) => {
    const allUploads = selectedDocumetsUploadStatus.map((data, index) => {
      if (data?.status == "UPLOADED" || data?.status == "UPLOADING")
        return Promise.resolve();
      const file = selectedDocuments[index];
      return new Promise<void>(async (resolve, reject) => {
        const extension = getFileExtension(file.uri);
        const blob = await fetch(file.uri).then((res) => res.blob());
        let upload = new Upload(blob, {
          endpoint: `https://vujcvquohckehaltpjxw.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1amN2cXVvaGNrZWhhbHRwanh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTI0NTc2OSwiZXhwIjoyMDQwODIxNzY5fQ.nRlmFPfpOCKUTAxj7DU5c9Q5W3xM0_1jrqiDryjTZCc`, // or replace with logged in user's access token.
            "x-upsert": "true", // optionally set upsert to true to overwrite existing files, requires RLS update policy.
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file https://github.com/tus/tus-js-client/blob/main/docs/api.md#removefingerprintonsuccess
          metadata: {
            bucketName: bucketName,
            // @ts-ignore TODO: check why types are acting up here.
            objectName: `${auth?.userDetails?.user_id}&${Date.now()}`,
            contentType: file.mimeType || "",
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
          onError: function (error) {
            setSelectedDocumetsUploadStatus((prevState) => {
              const selectedDocumetsUploadStatusCopy = [...prevState];
              selectedDocumetsUploadStatusCopy[index] = {
                status: "ERROR",
                uploadingStatus: 0,
                error: error?.message,
              };
              return selectedDocumetsUploadStatusCopy;
            });
            reject(error);
          },
          onProgress: function (bytesUploaded, bytesTotal) {
            var percentage = (bytesUploaded / bytesTotal).toFixed(2);

            setSelectedDocumetsUploadStatus((prevState) => {
              const selectedDocumetsUploadStatusCopy = [...prevState];
              selectedDocumetsUploadStatusCopy[index] = {
                status: "UPLOADING",
                uploadingStatus: Number(percentage),
              };
              return selectedDocumetsUploadStatusCopy;
            });
          },
          onSuccess: function () {
            console.log("Uploaded %s", upload?.options?.metadata?.objectName);
            setSelectedDocumetsUploadStatus((prevState) => {
              const selectedDocumetsUploadStatusCopy = [...prevState];
              selectedDocumetsUploadStatusCopy[index] = {
                ...selectedDocumetsUploadStatusCopy[index],
                status: "UPLOADED",
              };
              return selectedDocumetsUploadStatusCopy;
            });
            resolve();
          },
        });

        // Check if there are any previous uploads to continue.
        return upload.findPreviousUploads().then(function (previousUploads) {
          // Found previous uploads so we select the first one.
          if (previousUploads.length) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }

          // Start the upload
          upload.start();
        });
      });
    });
    await Promise.allSettled(allUploads);
    toast.show("Transactions will be processed and notified soon", {
      type: "normal",
      placement: "top",
      animationType:'zoom-in'
    });
    return;
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].background,
        alignItems: "center",
      }}
    >
      <Pressable
        onPress={pickDocuments}
        style={{
          width: "90%",
          height: 200,
          borderWidth: 2,
          borderColor: Colors[colorScheme ?? "light"].lightGreen,
          borderRadius: 40,
          alignItems: "center",
          justifyContent: "center",
          marginVertical: 20,
        }}
      >
        <View
          style={{
            width: "98%",
            height: 190,
            borderWidth: 2,
            borderColor: Colors[colorScheme ?? "light"].primary,
            borderRadius: 35,
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Entypo
            name="upload-to-cloud"
            size={50}
            color={Colors[colorScheme ?? "light"].primary}
          />
          <Text
            style={[
              textStyles.bolder,
              textStyles.md,
              {
                color: Colors[colorScheme ?? "light"].primary,
                textAlign: "center",
              },
            ]}
          >
            Click here{" "}
            <Text
              style={[
                textStyles.mdBold,
                textStyles.sm,
                {
                  color: Colors[colorScheme ?? "light"].darkText,
                  textAlign: "center",
                },
              ]}
            >
              to Upload the Transaction report from the Bank
            </Text>
          </Text>
          <Text
            style={[
              textStyles.mdBold,
              textStyles.sm,
              {
                color: Colors[colorScheme ?? "light"].gray,
                textAlign: "center",
                paddingTop: 20,
              },
            ]}
          >
            Supported Format : CSV,XLS,XLSX
          </Text>
        </View>
      </Pressable>

      <Text
        style={[
          textStyles.bolder,
          textStyles.lg,
          {
            color: Colors[colorScheme ?? "light"].gray,
            textAlign: "center",
            paddingLeft: 20,
            alignSelf: "flex-start",
          },
        ]}
      >
        Uploaded Files
      </Text>

      {selectedDocuments?.length <= 0 && (
        <Animated.View
          exiting={FadeOut}
          style={[
            commonStyles.alignJustifyCenter,
            { width: "100%", height: "40%" },
          ]}
        >
          <Image source={NoFiles} style={{ width: "80%", height: "80%" }} />
        </Animated.View>
      )}
      <ScrollView
        style={[{ width: "100%" }]}
        contentContainerStyle={commonStyles.alignJustifyCenter}
      >
        {selectedDocuments?.map((selectedDocumet, index) => {
          return (
            <Animated.View
              entering={FadeIn.delay(100 * index)}
              exiting={FadeOutUp}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                marginTop: 20,
                gap: 12,
                width: "90%",
              }}
              key={selectedDocumet?.uri}
            >
              <FontAwesome5
                name="file-excel"
                size={24}
                color={Colors[colorScheme ?? "light"].primary}
              />
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
                  numberOfLines={1}
                >
                  {selectedDocumet?.name}
                </Text>
                <Text
                  style={[
                    textStyles.xs,
                    commonStyles.alignJustifyCenter,
                    {
                      color: Colors[colorScheme ?? "light"].gray,
                    },
                  ]}
                >
                  {((selectedDocumet?.size || 0) / (1024 * 1024)).toFixed(2) +
                    " MB"}
                </Text>
              </View>
              {selectedDocumetsUploadStatus[index]?.status === "UPLOADING" && (
                <Animated.View>
                  <Progress.Circle
                    size={30}
                    indeterminate={false}
                    progress={
                      selectedDocumetsUploadStatus[index]?.uploadingStatus
                    }
                    textStyle={{ fontWeight: "bold" }}
                  />
                </Animated.View>
              )}
              {selectedDocumetsUploadStatus[index]?.status === "UPLOADED" && (
                <Animated.View>
                  <AntIcon
                    name="checkcircle"
                    size={24}
                    color={Colors[colorScheme ?? "light"].primary}
                  />
                </Animated.View>
              )}
              {selectedDocumetsUploadStatus[index]?.status ===
                "NOT_UPLOADED" && (
                <View>
                  <MaterialIcons
                    name="delete-outline"
                    size={24}
                    color={Colors[colorScheme ?? "light"].darkRed}
                    onPress={() => removeDocument(index)}
                  />
                </View>
              )}
              {selectedDocumetsUploadStatus[index]?.status === "ERROR" && (
                <View>
                  <MaterialIcons
                    name="cancel"
                    size={24}
                    color={Colors[colorScheme ?? "light"].darkRed}
                    onPress={() =>
                      toast.show(
                        selectedDocumetsUploadStatus[index]?.error ||
                          "Error in Uploading",
                        { type: "danger" }
                      )
                    }
                  />
                </View>
              )}
            </Animated.View>
          );
        })}
      </ScrollView>

      {selectedDocuments?.length > 0 && (
        <View>
          <CustomButton
            label="Process the Transcations"
            colorType="primary"
            onPress={() => {
              uploadFiles("transactions", selectedDocuments);
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

export default UploadTransaction;

const styles = StyleSheet.create({});
