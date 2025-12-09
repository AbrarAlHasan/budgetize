import BottomSheet from '@/components/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Image } from 'expo-image';
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type SupportedBank = 'HDFC';

interface BankOption {
  id: SupportedBank;
  name: string;
  icon: string;
}

const BANKS: BankOption[] = [
  {
    id: 'HDFC',
    name: 'HDFC Bank',
    icon: require('@/assets/bank-logos/hdfc-bank.png'),
  },
];

export interface BankSelectionBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface BankSelectionBottomSheetProps {
  onBankSelected: (bank: SupportedBank) => void;
}

export const BankSelectionBottomSheet = forwardRef<
  BankSelectionBottomSheetRef,
  BankSelectionBottomSheetProps
>(({ onBankSelected }, ref) => {
  const bottomSheetRef = useRef<BottomSheetModalMethods>(null);

  useImperativeHandle(ref, () => ({
    present: () => {
      bottomSheetRef.current?.present();
    },
    dismiss: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const handleBankSelect = useCallback((bank: SupportedBank) => {
    onBankSelected(bank);
    bottomSheetRef.current?.dismiss();
  }, [onBankSelected]);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  return (
    <BottomSheet
      bottomSheetModalRef={bottomSheetRef as React.RefObject<BottomSheetModalMethods>}
      snapPoints={['40%']}
      onClose={handleClose}
    >
      <View className="p-4">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Select Bank
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose your bank to import the statement
        </Text>

        <View className="gap-3">
          {BANKS.map((bank) => (
            <TouchableOpacity
              key={bank.id}
              onPress={() => handleBankSelect(bank.id)}
              className="flex-row items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              activeOpacity={0.7}
            >
              <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3 mr-3">
                <Image source={bank.icon} style={{ width: 24, height: 24 }} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {bank.name}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
});

