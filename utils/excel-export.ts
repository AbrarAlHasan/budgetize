import * as XLSX from 'xlsx';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import { format } from 'date-fns';
import { transactionRepository } from '@/repositories/transaction.repository';
import { accountRepository } from '@/repositories/account.repository';
import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { transactionTagRepository } from '@/repositories/transaction-tag.repository';
import { getCurrencySymbol } from '@/utils/currencies';
import { log, logError } from '@/utils/logger';

interface ExcelExportOptions {
  startDate: string;
  endDate: string;
}

interface ExcelRow {
  Date: string;
  Type: string;
  Amount: string;
  Account: string;
  Category: string;
  Tags: string;
  PaymentMode: string;
  Note: string;
}

/**
 * Exports transactions to Excel format for the specified date range
 * @param options Date range for export
 * @returns Path to the created Excel file, or null on failure
 */
export async function exportTransactionsToExcel(
  options: ExcelExportOptions
): Promise<string | null> {
  try {
    log('Starting Excel export process...');
    const { startDate, endDate } = options;

    // 1. Fetch transactions for the date range
    log('Fetching transactions...');
    const transactions = await transactionRepository.findByDateRange(
      startDate,
      endDate
    );

    if (transactions.length === 0) {
      log('No transactions found for the selected date range');
      return null;
    }

    log(`Found ${transactions.length} transactions`);

    // 2. Decrypt transactions
    log('Decrypting transactions...');
    const decryptedTransactions = await transactionRepository.decryptTransactions(
      transactions
    );

    // 3. Collect all unique IDs for batch fetching
    const accountIds = Array.from(
      new Set(decryptedTransactions.map((t) => t.account_id))
    );
    const categoryIds = Array.from(
      new Set(
        decryptedTransactions
          .map((t) => t.category_id)
          .filter((id): id is number => id !== null && id !== 0)
      )
    );
    const transactionIds = decryptedTransactions.map((t) => t.id);

    // 4. Fetch accounts, categories, and tags in parallel
    log('Fetching related data (accounts, categories, tags)...');
    const [accounts, categories, allTransactionTags] = await Promise.all([
      Promise.all(accountIds.map((id) => accountRepository.findById(id))),
      categoryIds.length > 0
        ? categoryRepository.findByIdsIncludingDeleted(categoryIds)
        : Promise.resolve([]),
      Promise.all(
        transactionIds.map((id) => transactionTagRepository.findByTransactionId(id))
      ),
    ]);

    // Filter out null accounts
    const validAccounts = accounts.filter(
      (a): a is Awaited<ReturnType<typeof accountRepository.findById>> => a !== null
    );

    // Decrypt accounts and categories
    const decryptedAccounts = await Promise.all(
      validAccounts.map((a) => accountRepository.decryptAccount(a))
    );
    const decryptedCategories =
      categoryIds.length > 0
        ? await categoryRepository.decryptCategories(categories)
        : [];

    // Collect all unique tag IDs
    const tagIdsSet = new Set<number>();
    allTransactionTags.forEach((tags) => {
      tags.forEach((tt) => tagIdsSet.add(tt.tag_id));
    });
    const tagIds = Array.from(tagIdsSet);

    // Fetch and decrypt tags
    const tags =
      tagIds.length > 0
        ? await tagRepository.findByIdsIncludingDeleted(tagIds)
        : [];
    const decryptedTags =
      tagIds.length > 0 ? await tagRepository.decryptTags(tags) : [];

    // 5. Create lookup maps for efficient access
    const accountMap = new Map(
      decryptedAccounts.map((a) => [a.id, a])
    );
    const categoryMap = new Map(
      decryptedCategories.map((c) => [c.id, c])
    );
    const tagMap = new Map(decryptedTags.map((t) => [t.id, t]));

    // Create transaction to tags map
    const transactionTagsMap = new Map<number, string[]>();
    decryptedTransactions.forEach((transaction, index) => {
      const transactionTagIds = allTransactionTags[index];
      const tagNames = transactionTagIds
        .map((tt) => {
          const tag = tagMap.get(tt.tag_id);
          return tag ? tag.name : null;
        })
        .filter((name): name is string => name !== null);
      transactionTagsMap.set(transaction.id, tagNames);
    });

    // 6. Format data into Excel rows (no IDs, only readable data)
    log('Formatting data for Excel...');
    const rows: ExcelRow[] = decryptedTransactions.map((transaction) => {
      const account = accountMap.get(transaction.account_id);
      const category = transaction.category_id
        ? categoryMap.get(transaction.category_id)
        : null;
      const tags = transactionTagsMap.get(transaction.id) || [];

      return {
        Date: format(new Date(transaction.date), 'MMM dd, yyyy'),
        Type: transaction.type === 'expense' ? 'Expense' : 'Income',
        Amount: transaction.amount.toFixed(2), // No currency symbol, just the number
        Account: account?.name || 'Unknown',
        Category: category?.name || '-',
        Tags: tags.join(', ') || '-',
        PaymentMode: transaction.payment_mode || '-',
        Note: transaction.note || '-',
      };
    });

    // 7. Create workbook and worksheet
    log('Creating Excel workbook...');
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 15 }, // Date
      { wch: 10 }, // Type
      { wch: 15 }, // Amount
      { wch: 20 }, // Account
      { wch: 20 }, // Category
      { wch: 25 }, // Tags
      { wch: 15 }, // PaymentMode
      { wch: 30 }, // Note
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    // 8. Generate Excel file
    log('Generating Excel file...');
    const excelBuffer = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx',
    });

    // 9. Save to file system
    const uri = Paths.document.uri;
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `transactions_${startDate}_to_${endDate}_${timestamp}.xlsx`;
    const filePath = `${uri}/${fileName}`;

    // Convert base64 to Uint8Array and write to file
    const binaryString = atob(excelBuffer);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const file = new File(filePath);
    // File.write() accepts Uint8Array for binary data
    file.write(bytes);

    log(`✓ Excel file created: ${filePath}`);
    return filePath;
  } catch (error) {
    logError('ERROR IN EXCEL EXPORT:', error);
    return null;
  }
}

/**
 * Exports transactions to Excel and shares the file
 * @param options Date range for export
 * @returns true if export and share were successful, false otherwise
 */
export async function exportAndShareTransactionsToExcel(
  options: ExcelExportOptions
): Promise<boolean> {
  try {
    // 1. Create the Excel file
    const filePath = await exportTransactionsToExcel(options);
    if (!filePath) {
      return false;
    }

    // 2. Share the file via system share dialog
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath);
      log('✓ Excel file shared via system dialog');
      return true;
    } else {
      logError('Sharing not available on this platform');
      return false;
    }
  } catch (error) {
    logError('ERROR IN EXCEL EXPORT AND SHARE:', error);
    return false;
  }
}

