import { Card } from "@/components/ui/card";
import {
  useExchange,
  useMarkExchangeAsSettled,
} from "@/hooks/queries/use-exchanges";
import { useSettingsStore } from "@/store/settings-store";
import { getCurrencySymbol } from "@/utils/currencies";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExchangeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const exchangeId = parseInt(params.id, 10);

  const { data: exchange, isLoading } = useExchange(exchangeId);
  const markAsSettled = useMarkExchangeAsSettled();
  const { settings } = useSettingsStore();
  const currencySymbol = getCurrencySymbol(settings?.currency || "INR");

  const handleMarkAsSettled = () => {
    if (!exchange) return;

    const actionText = exchange.type === "lent" ? "paid" : "received";
    Alert.alert(
      `Mark as ${actionText === "paid" ? "Paid" : "Received"}`,
      `Are you sure this exchange has been ${actionText}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await markAsSettled.mutateAsync(exchangeId);
              Alert.alert(
                "Success",
                `Exchange marked as ${
                  actionText === "paid" ? "paid" : "received"
                }`
              );
            } catch (error) {
              Alert.alert("Error", "Failed to update exchange status");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!exchange) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <Text className="text-gray-500 dark:text-gray-400">
          Exchange not found
        </Text>
      </View>
    );
  }

  const isLent = exchange.type === "lent";
  const isPending = exchange.status === "pending";
  const isSettled =
    exchange.status === "paid" || exchange.status === "received";

  const primaryColor = isLent ? "#3B82F6" : "#F59E0B";
  const statusColor = isPending ? "#F59E0B" : isSettled ? "#10B981" : "#6B7280";

  const statusText =
    exchange.status === "pending"
      ? "Pending"
      : exchange.status === "paid"
      ? "Paid"
      : "Received";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Exchange Details",
          headerBackTitle: "Exchange",
          headerStyle: {
            backgroundColor: primaryColor,
          },
          headerTintColor: "#FFFFFF",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push({
                pathname: "/exchanges/add",
                params: { id: exchangeId.toString(), from: "Exchange Details" }
              })}
              style={{
                width: 40,
                borderRadius: 100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="create-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <SafeAreaView
        className="flex-1 bg-gray-50 dark:bg-black"
        edges={["bottom"]}
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4">
            {/* Status Card */}
            <Card className="mb-4">
              <View className="items-center py-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{
                    backgroundColor: isLent ? "#DBEAFE" : "#FEF3C7",
                  }}
                >
                  <Ionicons
                    name={isLent ? "trending-up" : "trending-down"}
                    size={32}
                    color={isLent ? "#3B82F6" : "#F59E0B"}
                  />
                </View>
                <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {currencySymbol}
                  {exchange.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <View
                  className="px-4 py-2 rounded-full mt-2"
                  style={{
                    backgroundColor:
                      exchange.status === "pending"
                        ? "#FEF3C7"
                        : exchange.status === "paid" ||
                          exchange.status === "received"
                        ? "#D1FAE5"
                        : "#F3F4F6",
                  }}
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: statusColor }}
                  >
                    {statusText}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Details Card */}
            <Card className="mb-4">
              <View className="space-y-4">
                <View>
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name={isLent ? "person-outline" : "person-outline"}
                      size={14}
                      color="#6B7280"
                    />
                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                      {isLent ? "Lent To" : "Borrowed From"}
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {exchange.person_name}
                  </Text>
                </View>

                <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color="#6B7280"
                    />
                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                      Exchange Date
                    </Text>
                  </View>
                  <Text className="text-base text-gray-900 dark:text-gray-100">
                    {format(parseISO(exchange.date), "EEEE, dd MMMM yyyy")}
                  </Text>
                </View>

                {exchange.due_date && (
                  <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                        Due Date
                      </Text>
                    </View>
                    <Text className="text-base text-gray-900 dark:text-gray-100">
                      {format(
                        parseISO(exchange.due_date),
                        "EEEE, dd MMMM yyyy"
                      )}
                    </Text>
                    {isPending && new Date(exchange.due_date) < new Date() && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="warning" size={14} color="#EF4444" />
                        <Text className="text-sm text-red-600 dark:text-red-400 ml-1">
                          Overdue
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {exchange.note && (
                  <View className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <View className="flex-row items-center mb-1">
                      <Ionicons
                        name="document-text-outline"
                        size={14}
                        color="#6B7280"
                      />
                      <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">
                        Note
                      </Text>
                    </View>
                    <Text className="text-base text-gray-900 dark:text-gray-100">
                      {exchange.note}
                    </Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Actions */}
            {isPending && (
              <TouchableOpacity
                onPress={handleMarkAsSettled}
                className="bg-green-600 dark:bg-green-500 rounded-xl p-4 items-center mb-4"
                disabled={markAsSettled.isPending}
              >
                {markAsSettled.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text className="text-white font-semibold text-base mt-2">
                      Mark as {isLent ? "Paid" : "Received"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isSettled && (
              <Card className="mb-4">
                <View className="items-center py-2">
                  <Ionicons
                    name="checkmark-circle"
                    size={32}
                    color="#10B981"
                    style={{ marginBottom: 8 }}
                  />
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    This exchange has been {isLent ? "paid" : "received"}
                  </Text>
                </View>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
