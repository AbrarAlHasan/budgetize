import { useRef, useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useDeleteTransaction } from '@/hooks/queries/use-transactions';
import { transactionRepository } from '@/repositories/transaction.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { TransactionActionsBottomSheetRef } from '@/components/transaction-actions-bottom-sheet';
import { useCustomAlert } from '@/hooks/use-custom-alert';

export function useTransactionActions() {
  const actionsBottomSheetRef = useRef<TransactionActionsBottomSheetRef>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const deleteTransaction = useDeleteTransaction();
  const { alert } = useCustomAlert();

  const handleLongPress = useCallback((transactionId: number) => {
    setSelectedTransactionId(transactionId);
    actionsBottomSheetRef.current?.present();
  }, []);

  const handleEdit = useCallback(() => {
    if (!selectedTransactionId) return;
    actionsBottomSheetRef.current?.dismiss();
    router.push(`/expenses/${selectedTransactionId}`);
    setSelectedTransactionId(null);
  }, [selectedTransactionId]);

  const handleDelete = useCallback(() => {
    if (!selectedTransactionId) return;
    actionsBottomSheetRef.current?.dismiss();
    
    const transactionId = selectedTransactionId;
    setSelectedTransactionId(null);
    
    alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction.mutateAsync(transactionId);
            } catch (error) {
              alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  }, [selectedTransactionId, deleteTransaction, alert]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedTransactionId) return;
    actionsBottomSheetRef.current?.dismiss();
    
    const transactionId = selectedTransactionId;
    setSelectedTransactionId(null);
    
    try {
      // Fetch transaction data
      const transaction = await transactionRepository.findById(transactionId);
      if (!transaction) {
        alert('Error', 'Transaction not found');
        return;
      }

      // Decrypt transaction
      const decryptedTransaction = await transactionRepository.decryptTransaction(transaction);

      // Fetch tags
      const transactionTags = await transactionTagRepository.findByTransactionId(transactionId);
      const tagIds = transactionTags.map(tt => tt.tag_id);

      // Navigate to add screen with prefilled data
      router.push({
        pathname: '/expenses/add',
        params: {
          from: 'Transactions',
          duplicate: 'true',
          amount: decryptedTransaction.amount.toString(),
          type: decryptedTransaction.type,
          accountId: decryptedTransaction.account_id.toString(),
          categoryId: decryptedTransaction.category_id?.toString() || '',
          date: decryptedTransaction.date,
          note: decryptedTransaction.note || '',
          paymentMode: decryptedTransaction.payment_mode || '',
          tagIds: tagIds.join(','),
        },
      });
    } catch (error) {
      alert('Error', 'Failed to duplicate transaction');
    }
  }, [selectedTransactionId, alert]);

  return {
    actionsBottomSheetRef,
    handleLongPress,
    handleEdit,
    handleDelete,
    handleDuplicate,
  };
}

