import { Button } from "@/components/ui/button";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountType } from "@/db/schema/types";
import {
  useAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/hooks/queries/use-accounts";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function AccountDetailScreen() {
  const queryClient = useQueryClient();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const accountId = parseInt(id || "0", 10);
  const originLabel = from ?? "Back";

  const { data: account, isLoading } = useAccount(accountId);
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("debit");
  const [bankName, setBankName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [billingStartDate, setBillingStartDate] = useState("");
  const [billingEndDate, setBillingEndDate] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");

  useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setBankName(account.bank_name || "");
      setCreditLimit(account.credit_limit?.toString() || "");
      setBillingStartDate(account.billing_start_date || "");
      setBillingEndDate(account.billing_end_date || "");
      setPaymentDueDate(account.payment_due_date || "");
    }
  }, [account]);

  const accountTypeOptions = [
    { label: "Debit Card", value: "debit" },
    { label: "Credit Card", value: "credit" },
    { label: "Borrowed Money", value: "borrowed" },
    { label: "Lent Money", value: "lent" },
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Account name is required");
      return;
    }

    try {
      await updateAccount.mutateAsync({
        id: accountId,
        name: name.trim(),
        type,
        bank_name: bankName.trim() || null,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
        billing_start_date: billingStartDate || null,
        billing_end_date: billingEndDate || null,
        payment_due_date: paymentDueDate || null,
      });
      Alert.alert("Success", "Account updated successfully");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to update account");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete this account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync(accountId);
              Alert.alert("Success", "Account deleted successfully");
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!account) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <Text className="text-gray-500 dark:text-gray-400">
          Account not found
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Edit Account",
          headerBackTitle: originLabel,
        }}
      />
      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-black"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          <Card>
            <Input
              label="Account Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter account name"
            />

            <BottomSheetSelect
              label="Account Type"
              options={accountTypeOptions}
              value={type}
              onValueChange={(value) => setType(value as AccountType)}
            />

            <Input
              label="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              placeholder="Enter bank name (optional)"
            />

            {type === "credit" && (
              <>
                <Input
                  label="Credit Limit"
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  placeholder="Enter credit limit"
                  keyboardType="numeric"
                />
                <Input
                  label="Billing Start Date"
                  value={billingStartDate}
                  onChangeText={setBillingStartDate}
                  placeholder="YYYY-MM-DD"
                />
                <Input
                  label="Billing End Date"
                  value={billingEndDate}
                  onChangeText={setBillingEndDate}
                  placeholder="YYYY-MM-DD"
                />
                <Input
                  label="Payment Due Date"
                  value={paymentDueDate}
                  onChangeText={setPaymentDueDate}
                  placeholder="YYYY-MM-DD"
                />
              </>
            )}

            <View className="flex-row gap-2 mt-4">
              <Button
                onPress={handleSave}
                loading={updateAccount.isPending}
                className="flex-1"
              >
                Save
              </Button>
              <Button
                onPress={handleDelete}
                variant="outline"
                loading={deleteAccount.isPending}
                className="flex-1"
              >
                Delete
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
