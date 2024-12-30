import {
  Appearance,
  Pressable,
  RefreshControl,
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
import PaytmLogo from "@/assets/images/paytmLogo.png";
import { supabase } from "@/lib/supabase";
import { ITransactionFileForProcessing } from "@/types/TransactionScreenTypes";
import UploadTransactionList from "./components/UploadTransactionList";
import CustomActionModal from "@/components/CustomActionModal";
import { useFocusEffect } from "expo-router";
import { groupData } from "@/utils/CommonUtlis";
import { SafeAreaView } from "react-native-safe-area-context";

export enum StatusEnum {
  "NOT_UPLOADED",
  "UPLOADING",
  "UPLOADED",
  "ERROR",
}

export interface ISelectedDocuments extends DocumentPicker.DocumentPickerAsset {
  uniqueName: string;
  status: StatusEnum;
  uploadingStatus: number;
  error?: string;
}

export interface ISelectedDocumetsUploadStatus {
  status: StatusEnum;
  uploadingStatus: number;
  error?: string;
}

const UploadTransaction = () => {
  const colorScheme = useColorScheme();
  const toast = useToast();

  const auth = useSelector((state: RootState) => state.AuthSlice);

  const [selectedDocuments, setSelectedDocuments] = useState<
    ISelectedDocuments[]
  >([]);

  const [transactionDocuments, setTransactionDocuments] = useState<
    ITransactionFileForProcessing[]
  >([]);

  const [selectedDocumetsUploadStatus, setSelectedDocumetsUploadStatus] =
    useState<ISelectedDocumetsUploadStatus[]>([]);

  // useEffect(() => {
  //   getTransactionFilesFromDB();
  // }, []);

  useFocusEffect(
    React.useCallback(() => {
      getTransactionFilesFromDB();
    }, [])
  );

  function generateUniqueFileName(fileName: string) {
    const parts = fileName.split(".");
    const extension = parts.length > 1 ? parts.pop() : ""; // Return the last part as extension
    // Current timestamp
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");

    // Random unique identifier
    const randomId = Math.random().toString(36).substring(2, 10);

    // Combine timestamp and random ID with the given extension
    return `file_${timestamp}_${randomId}.${extension}`;
  }

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true, // Allows the user to select any file
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
      });
      if (!result.canceled) {
        const successResult =
          result as DocumentPicker.DocumentPickerSuccessResult;
        const assetsAppendWithName = successResult.assets.map((asset) => {
          return {
            ...asset,
            uniqueName: generateUniqueFileName(asset.name),
            status: StatusEnum.NOT_UPLOADED,
            uploadingStatus: 0,
          };
        });
        const appendedDocuments = [
          ...selectedDocuments,
          ...assetsAppendWithName,
        ];

        setSelectedDocuments(appendedDocuments);

        setSelectedDocumetsUploadStatus(
          Array.from({ length: appendedDocuments?.length }, () => ({
            status: StatusEnum.NOT_UPLOADED,
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

  const removeDocument = async (index: number, storage: "SERVER" | "LOCAL") => {
    if (storage === "LOCAL") {
      setSelectedDocuments((prevSelectedDocuments) => {
        return prevSelectedDocuments.filter((_, i) => {
          return i !== index;
        });
      });

      setSelectedDocumetsUploadStatus((prevState) =>
        prevState.filter((_, i) => {
          return i !== index;
        })
      );
    }

    if (storage === "SERVER") {
      const selecetedData = transactionDocuments[index];
      setTransactionDocuments((prevSelectedDocuments) => {
        const transactionDocumentsCopy = [...prevSelectedDocuments];
        transactionDocumentsCopy[index] = {
          ...transactionDocumentsCopy[index],
          status: "PROCESSING",
        };

        return transactionDocumentsCopy;
      });

      try {
        await supabase
          .from("files_for_processing_transactions")
          .delete()
          .eq("uniqueName", selecetedData.uniqueName);
        await supabase
          .from("processed_transactions")
          .delete()
          .eq("file_name", selecetedData.uniqueName);
        await supabase.storage
          .from("transactions")
          .remove([selecetedData.uniqueName]);

        await getTransactionFilesFromDB();
      } catch (error) {}
    }
  };

  const uploadFiles = async (
    bucketName: string,
    pickerResult: DocumentPicker.DocumentPickerAsset[]
  ) => {
    const allUploads = selectedDocuments.map((file, index) => {
      if (
        file?.status == StatusEnum.UPLOADED ||
        file?.status == StatusEnum.UPLOADING
      )
        return Promise.resolve();

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
            objectName: file.uniqueName,
            contentType: file.mimeType || "",
            cacheControl: "3600",
          },
          chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
          onError: function (error) {
            // setSelectedDocumetsUploadStatus((prevState) => {
            //   const selectedDocumetsUploadStatusCopy = [...prevState];
            //   selectedDocumetsUploadStatusCopy[index] = {
            //     status: "ERROR",
            //     uploadingStatus: 0,
            //     error: error?.message,
            //   };
            //   return selectedDocumetsUploadStatusCopy;
            // });
            setSelectedDocuments((prevState) => {
              const selectedDocumentCopy = [...prevState];
              selectedDocumentCopy[index] = {
                ...selectedDocumentCopy[index],
                status: StatusEnum.ERROR,
                error: error?.message,
              };
              return selectedDocumentCopy;
            });
            reject(error);
          },
          onProgress: function (bytesUploaded, bytesTotal) {
            var percentage = (bytesUploaded / bytesTotal).toFixed(2);

            setSelectedDocuments((prevState) => {
              const selectedDocumentCopy = [...prevState];
              selectedDocumentCopy[index] = {
                ...selectedDocumentCopy[index],
                status: StatusEnum.UPLOADING,
                uploadingStatus: Number(percentage),
              };
              return selectedDocumentCopy;
            });
          },
          onSuccess: async function () {
            setSelectedDocuments((prevState) => {
              const selectedDocumentCopy = [...prevState];
              selectedDocumentCopy[index] = {
                ...selectedDocumentCopy[index],
                status: StatusEnum.UPLOADED,
              };
              return selectedDocumentCopy;
            });
            await supabase.from("files_for_processing_transactions").insert({
              name: file.name,
              uniqueName: file.uniqueName,
              user_id: auth?.userDetails?.user_id,
              transaction_source: "PAYTM",
            });
            await getTransactionFilesFromDB();
            supabase.functions.invoke("process-transaction-file", {
              body: {
                userId: auth.userDetails?.user_id,
              },
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
      animationType: "zoom-in",
    });
    return;
  };

  const getTransactionFilesFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from("files_for_processing_transactions")
        .select("*")
        .eq("user_id", auth?.userDetails?.user_id)
        .order("status", {
          ascending: false,
        });

      // const groupedData = groupData(data, "status");
      // console.log(groupedData);

      if (error) {
        console.log("Error in fetching files", error);
      }
      if (data) {
        setTransactionDocuments(data);
      }
    } catch (error) {}
  };

  return (
    <>
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
                textStyles.xxs,
                {
                  color: Colors[colorScheme ?? "light"].gray,
                  textAlign: "center",
                  paddingTop: 20,
                },
              ]}
            >
              We Accept Only Paytm Transactions in .xlsx Format. Uploading any
              other Transaction report will result in Error.
            </Text>
          </View>
        </Pressable>

        {selectedDocuments?.filter(
          (data) => data?.status != StatusEnum.UPLOADED
        )?.length > 0 && (
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
            Uploading Files
          </Text>
        )}

        {selectedDocuments?.length <= 0 &&
          transactionDocuments?.length <= 0 && (
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
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={getTransactionFilesFromDB}
            />
          }
        >
          {selectedDocuments
            ?.filter((data) => data?.status != StatusEnum.UPLOADED)
            ?.map((selectedDocument, index) => {
              return (
                <UploadTransactionList
                  transaction={selectedDocument}
                  index={index}
                  removeDocument={removeDocument}
                  key={selectedDocument?.uri}
                  storage="LOCAL"
                  animationDelay={300}
                />
              );
            })}
          {transactionDocuments?.length > 0 && (
            <Text
              style={[
                textStyles.bolder,
                textStyles.lg,
                {
                  color: Colors[colorScheme ?? "light"].gray,
                  textAlign: "center",
                  paddingLeft: 20,
                },
              ]}
            >
              Uploaded Files
            </Text>
          )}
          {transactionDocuments?.map((selectedDocument, index) => {
            return (
              <UploadTransactionList
                transaction={selectedDocument}
                index={index}
                removeDocument={removeDocument}
                key={selectedDocument?.uniqueName}
                storage="SERVER"
              />
            );
          })}
        </ScrollView>

        {selectedDocuments?.length > 0 && (
          <View>
            <CustomButton
              label="Process the Transcations"
              colorType="primary"
              onPress={() => {
                if (selectedDocuments?.length > 0)
                  uploadFiles("transactions", selectedDocuments);
              }}
            />
          </View>
        )}
      </SafeAreaView>
    </>
  );
};

export default UploadTransaction;

const styles = StyleSheet.create({});
