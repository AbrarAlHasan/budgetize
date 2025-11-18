import { Button } from "@/components/ui/button";
import { BottomSheetSelect } from "@/components/ui/bottom-sheet-select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AccountType } from "@/db/schema/types";
import { useCreateAccount } from "@/hooks/queries/use-accounts";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

export default function AddAccountScreen() {
  const createAccount = useCreateAccount();
  const params = useLocalSearchParams<{ from?: string }>();
  const originLabel = params.from ?? "Back";

  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("debit");
  const [bankName, setBankName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [billingStartDate, setBillingStartDate] = useState("");
  const [billingEndDate, setBillingEndDate] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");

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
      await createAccount.mutateAsync({
        name: name.trim(),
        type,
        bank_name: bankName.trim() || null,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
        billing_start_date: billingStartDate || null,
        billing_end_date: billingEndDate || null,
        payment_due_date: paymentDueDate || null,
      });
      Alert.alert("Success", "Account created successfully");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to create account");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ 
          headerShown: true, 
          headerTitle: "Add Account",
          headerBackTitle: originLabel
        }}
      />
      <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
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

            <View className="mt-4">
              <Button onPress={handleSave} loading={createAccount.isPending}>
                Create Account
              </Button>
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}
