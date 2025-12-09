import { parse, format } from 'date-fns';
import { readAsStringAsync } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { log, logError } from './logger';

export interface ParsedTransaction {
  id: string; // Temporary ID for UI
  date: string; // YYYY-MM-DD format
  narration: string;
  referenceNumber: string;
  amount: number;
  type: 'expense' | 'income';
  // User-editable fields
  accountId: number | null;
  categoryId: number | null;
  tagIds: number[];
  note: string;
  paymentMode: string;
  // Status
  isRequired: boolean; // true if account is not selected
  isDeleted: boolean;
}

export interface BankStatementParseResult {
  transactions: ParsedTransaction[];
  accountNumber?: string;
  accountName?: string;
  statementPeriod?: {
    from: string;
    to: string;
  };
  bankName?: string;
}

/**
 * Bank format parser interface
 * Each bank should implement this interface
 */
export type SupportedBank = 'HDFC';

export interface BankFormatParser {
  /**
   * Detect if this parser can handle the given file
   */
  canParse(rawData: any[][]): boolean;

  /**
   * Parse the bank statement and extract transactions
   */
  parse(
    rawData: any[][],
    headerRowIndex: number,
    columnIndices?: {
      date?: number;
      narration?: number;
      ref?: number;
      withdrawal?: number;
      deposit?: number;
    }
  ): {
    transactions: ParsedTransaction[];
    accountNumber?: string;
    accountName?: string;
    statementPeriod?: { from: string; to: string };
  };
}

/**
 * HDFC Bank Statement Parser
 * Handles HDFC Bank Excel/CSV format
 */
class HDFCBankParser implements BankFormatParser {
  canParse(rawData: any[][]): boolean {
    // Check for HDFC Bank indicators
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (Array.isArray(row)) {
        const rowText = row.join(' ').toUpperCase();
        if (
          rowText.includes('HDFC BANK') ||
          (rowText.includes('HDFC') && rowText.includes('STATEMENT'))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  parse(
    rawData: any[][],
    headerRowIndex: number,
    columnIndices?: {
      date?: number;
      narration?: number;
      ref?: number;
      withdrawal?: number;
      deposit?: number;
    }
  ): {
    transactions: ParsedTransaction[];
    accountNumber?: string;
    accountName?: string;
    statementPeriod?: { from: string; to: string };
  } {
    // Use provided column indices or defaults
    const dateCol = columnIndices?.date ?? 0;
    const narrationCol = columnIndices?.narration ?? 1;
    const refCol = columnIndices?.ref ?? 2;
    const withdrawalCol = columnIndices?.withdrawal ?? 4;
    const depositCol = columnIndices?.deposit ?? 5;
    // Extract account info from header rows
    let accountNumber: string | undefined;
    let accountName: string | undefined;
    let statementFrom: string | undefined;
    let statementTo: string | undefined;

    for (let i = 0; i < headerRowIndex; i++) {
      const row = rawData[i];
      if (Array.isArray(row)) {
        const rowText = row.join(' ');
        // Extract account number
        if (rowText.includes('Account No :')) {
          const match = rowText.match(/Account No\s*:\s*(\d+)/i);
          if (match) accountNumber = match[1].trim();
        }
        // Extract account name
        if (rowText.match(/^(MR|MRS|MS)\s+/i)) {
          const match = rowText.match(/(?:MR|MRS|MS)\s+([A-Z\s]+)/i);
          if (match) accountName = match[1].trim();
        }
        // Extract statement period
        if (rowText.includes('Statement From')) {
          const fromMatch = rowText.match(/From\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
          const toMatch = rowText.match(/To\s*:\s*(\d{2}\/\d{2}\/\d{4})/i);
          if (fromMatch) statementFrom = fromMatch[1];
          if (toMatch) statementTo = toMatch[1];
        }
      }
    }

    // Parse transactions
    const transactions: ParsedTransaction[] = [];
    let transactionIdCounter = 1;

    log(`Starting transaction parsing from row ${headerRowIndex + 1}, total rows: ${rawData.length}`);
    log(`Using column indices - Date: ${dateCol}, Narration: ${narrationCol}, Ref: ${refCol}, Withdrawal: ${withdrawalCol}, Deposit: ${depositCol}`);

    const minRequiredColumns = Math.max(dateCol, narrationCol, withdrawalCol, depositCol, refCol) + 1;

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) {
        log(`Row ${i} is not an array, skipping`);
        continue;
      }

      if (row.length < minRequiredColumns) {
        log(`Row ${i} has insufficient columns (${row.length}, need ${minRequiredColumns}), skipping`);
        continue;
      }

      // Skip separator rows - check the date column
      const firstCell = String(row[dateCol] || '').trim();
      
      // Skip rows that are clearly separators or headers
      if (
        firstCell === '' ||
        firstCell === 'STATEMENT SUMMARY' ||
        firstCell === 'Opening Balance' ||
        firstCell.toLowerCase() === 'date' ||
        firstCell.match(/^[*\-]+$/) // Only asterisks or dashes (separator rows)
      ) {
        // If it's a separator row (only asterisks/dashes), skip it but continue
        if (firstCell.match(/^[*\-]+$/)) {
          log(`Row ${i} is a separator row, skipping but continuing`);
          continue;
        }
        // Otherwise, it's likely the end of transactions
        log(`Reached end of transactions at row ${i} (found: "${firstCell}")`);
        break; // End of transactions
      }

      // Parse transaction data using detected column indices
      const dateStr = String(row[dateCol] || '').trim();
      const narrationRaw = String(row[narrationCol] || '').trim();
      const refNo = String(row[refCol] || '').trim();
      const withdrawalStr = String(row[withdrawalCol] || '').trim();
      const depositStr = String(row[depositCol] || '').trim();

      // Extract description from HDFC narration format: text after last hyphen
      // Special case: If narration starts with "ATW-", it's an ATM withdrawal
      // Example: "ATW-..." → Note: "ATM Withdrawal"
      // Example: "ABOOBACK-MOHAMEDSIDDIQ451@OKICICI-IOBA0000067-570120080612-UPI"
      // Description would be "UPI" but we ignore it as it's generic, so note remains empty
      // Example: "HASIB-ABDULHASIBN-4@OKHDFCBANK-HDFC0002618-114999751821-FOR SAVINGS POT"
      // Description would be "FOR SAVINGS POT" - put this in the note field
      let note = '';
      
      // Check if it's an ATM withdrawal
      if (narrationRaw.trim().toUpperCase().startsWith('ATW-')) {
        note = 'ATM Withdrawal';
      } else if (narrationRaw.includes('-')) {
        const parts = narrationRaw.split('-');
        const lastPart = parts[parts.length - 1].trim();
        
        // If last part is not "UPI" (case-insensitive), use it as the note
        if (lastPart.toUpperCase() !== 'UPI' && lastPart.length > 0) {
          note = lastPart;
        }
        // If it's UPI, leave note empty (ignore it as it's generic)
      }

      log(`Row ${i} - Date: "${dateStr}", Narration: "${narrationRaw}", Note: "${note}", Withdrawal: "${withdrawalStr}", Deposit: "${depositStr}"`);

      // Skip if no date or invalid date format
      if (!dateStr || dateStr === 'Date' || dateStr.match(/^[*\-]+$/)) {
        log(`Row ${i} skipped: invalid date "${dateStr}"`);
        continue;
      }

      // Parse date (DD/MM/YY format)
      let transactionDate: Date;
      try {
        // Try DD/MM/YY format first
        transactionDate = parse(dateStr, 'dd/MM/yy', new Date());
        if (isNaN(transactionDate.getTime())) {
          // Try DD/MM/YYYY format
          transactionDate = parse(dateStr, 'dd/MM/yyyy', new Date());
        }
        if (isNaN(transactionDate.getTime())) {
          logError('Invalid date format:', dateStr);
          continue;
        }
      } catch (error) {
        logError('Error parsing date:', dateStr, error);
        continue;
      }

      // Determine transaction type and amount
      const withdrawal = parseFloat(withdrawalStr.replace(/,/g, '')) || 0;
      const deposit = parseFloat(depositStr.replace(/,/g, '')) || 0;

      log(`Row ${i} - Parsed amounts - Withdrawal: ${withdrawal}, Deposit: ${deposit}`);

      if (withdrawal === 0 && deposit === 0) {
        log(`Row ${i} skipped: no amount found`);
        continue; // Skip if no amount
      }

      const amount = withdrawal > 0 ? withdrawal : deposit;
      const type = withdrawal > 0 ? 'expense' : 'income';

      log(`Row ${i} - Creating transaction: ${type}, amount: ${amount}, date: ${dateStr}`);

      // Format date as YYYY-MM-DD (use format instead of toISOString to avoid UTC conversion issues)
      const formattedDate = format(transactionDate, 'yyyy-MM-dd');

      transactions.push({
        id: `temp_${transactionIdCounter++}`,
        date: formattedDate,
        narration: narrationRaw,
        referenceNumber: refNo,
        amount,
        type,
        accountId: null,
        categoryId: null,
        tagIds: [],
        note,
        paymentMode: '',
        isRequired: true,
        isDeleted: false,
      });
    }

    log(`HDFC Parser: Parsed ${transactions.length} transactions`);

    return {
      transactions,
      accountNumber,
      accountName,
      statementPeriod:
        statementFrom && statementTo
          ? { from: statementFrom, to: statementTo }
          : undefined,
    };
  }
}

/**
 * Registry of bank parsers
 * Add new bank parsers here
 */
const bankParsers: BankFormatParser[] = [
  new HDFCBankParser(),
  // Add more bank parsers here as needed
  // new ICICIBankParser(),
  // new SBIBankParser(),
];

/**
 * Processes HDFC Bank statement
 * @param fileUri - URI of the file to parse
 * @returns Parsed transactions and account info
 */
export async function processHDFCBankStatement(
  fileUri: string
): Promise<BankStatementParseResult> {
  return processBankStatement(fileUri, 'HDFC');
}

/**
 * Parses bank statement from Excel/CSV file
 * Uses the specified bank's parser
 * 
 * @param fileUri - URI of the file to parse
 * @param bank - Bank name to use for parsing
 * @returns Parsed transactions and account info
 */
async function processBankStatement(
  fileUri: string,
  bank: SupportedBank
): Promise<BankStatementParseResult> {
  try {
    log('Parsing bank statement file:', fileUri);

    // Read file
    const fileExtension = fileUri.split('.').pop()?.toLowerCase();

    let workbook: XLSX.WorkBook;
    let worksheet: XLSX.WorkSheet;

    if (fileExtension === 'csv') {
      // Read CSV file as text
      const csvContent = await readAsStringAsync(fileUri);
      workbook = XLSX.read(csvContent, { type: 'string' });
    } else {
      // Read Excel file (.xlsx, .xls) as binary
      // Use fetch to read the file as binary data
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix if present (e.g., "data:application/vnd.ms-excel;base64,")
          const base64 = result.split(',')[1] || result;
          resolve(base64);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file as base64'));
        };
        reader.readAsDataURL(blob);
      });

      const base64 = await base64Promise;
      workbook = XLSX.read(base64, { type: 'base64' });
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    worksheet = workbook.Sheets[sheetName];
    // Convert to JSON array
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    }) as any[][];


    // Find header row (contains "Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance")
    let headerRowIndex = -1;
    let dateColumnIndex = -1;
    let narrationColumnIndex = -1;
    let refColumnIndex = -1;
    let withdrawalColumnIndex = -1;
    let depositColumnIndex = -1;

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;

      // Check if this row contains header keywords
      const rowText = row.map((cell) => String(cell || '').trim()).join(' ').toLowerCase();
      const hasDate = rowText.includes('date');
      const hasNarration = rowText.includes('narration') || rowText.includes('description');
      const hasWithdrawal = rowText.includes('withdrawal') || rowText.includes('debit');
      const hasDeposit = rowText.includes('deposit') || rowText.includes('credit');

      if (hasDate && (hasNarration || hasWithdrawal || hasDeposit)) {
        headerRowIndex = i;
        log(`Found header row at index ${i}:`, row);

        // Find column indices
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim().toLowerCase();
          if (cell.includes('date') && dateColumnIndex === -1) {
            dateColumnIndex = j;
          } else if ((cell.includes('narration') || cell.includes('description')) && narrationColumnIndex === -1) {
            narrationColumnIndex = j;
          } else if ((cell.includes('ref') || cell.includes('chq')) && refColumnIndex === -1) {
            refColumnIndex = j;
          } else if ((cell.includes('withdrawal') || cell.includes('debit')) && withdrawalColumnIndex === -1) {
            withdrawalColumnIndex = j;
          } else if ((cell.includes('deposit') || cell.includes('credit')) && depositColumnIndex === -1) {
            depositColumnIndex = j;
          }
        }

        log(`Column indices - Date: ${dateColumnIndex}, Narration: ${narrationColumnIndex}, Ref: ${refColumnIndex}, Withdrawal: ${withdrawalColumnIndex}, Deposit: ${depositColumnIndex}`);
        break;
      }
    }

    if (headerRowIndex === -1) {
      logError('Could not find header row. First 10 rows:', rawData.slice(0, 10));
      throw new Error(
        'Could not find transaction header row in the file. Please ensure the file is a valid bank statement.'
      );
    }

    // Fallback to default column indices if not found
    if (dateColumnIndex === -1) dateColumnIndex = 0;
    if (narrationColumnIndex === -1) narrationColumnIndex = 1;
    if (refColumnIndex === -1) refColumnIndex = 2;
    if (withdrawalColumnIndex === -1) withdrawalColumnIndex = 4;
    if (depositColumnIndex === -1) depositColumnIndex = 5;

    // Get parser for specified bank
    let parser: BankFormatParser | null = null;
    
    if (bank === 'HDFC') {
      parser = bankParsers.find((p) => p instanceof HDFCBankParser) || null;
    }

    if (!parser) {
      throw new Error(
        `Unsupported bank: ${bank}. Currently supported banks: HDFC.`
      );
    }

    log(`Using parser for bank: ${bank}`);

    // Pass column indices to parser
    const columnIndices = {
      date: dateColumnIndex,
      narration: narrationColumnIndex,
      ref: refColumnIndex,
      withdrawal: withdrawalColumnIndex,
      deposit: depositColumnIndex,
    };

    // Parse using detected parser
    const result = parser.parse(rawData, headerRowIndex, columnIndices);

    log(
      `Parsed ${result.transactions.length} transactions from bank statement`
    );

    return {
      ...result,
      bankName: bank,
    };
  } catch (error) {
      logError('Error parsing bank statement:', error);
      throw new Error(
        `Failed to parse bank statement: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

/**
 * Parses bank statement from Excel/CSV file
 * Automatically detects bank format and uses appropriate parser
 * 
 * @deprecated Use processHDFCBankStatement or other bank-specific functions instead
 * @param fileUri - URI of the file to parse
 * @returns Parsed transactions and account info
 */
export async function parseBankStatement(
  fileUri: string
): Promise<BankStatementParseResult> {
  // Try to auto-detect bank
  const { File } = await import('expo-file-system');
  const file = new File(fileUri);
  if (!file.exists) {
    throw new Error('File does not exist');
  }

  const fileExtension = fileUri.split('.').pop()?.toLowerCase();
  let workbook: XLSX.WorkBook;

  if (fileExtension === 'csv') {
    const csvContent = await readAsStringAsync(fileUri);
    workbook = XLSX.read(csvContent, { type: 'string' });
  } else {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file as base64'));
      };
      reader.readAsDataURL(blob);
    });
    const base64 = await base64Promise;
    workbook = XLSX.read(base64, { type: 'base64' });
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
  }) as any[][];

  // Auto-detect bank
  for (const p of bankParsers) {
    if (p.canParse(rawData)) {
      const bankName = p instanceof HDFCBankParser ? 'HDFC' : 'HDFC';
      log('Auto-detected bank:', bankName);
      return processBankStatement(fileUri, bankName as SupportedBank);
    }
  }

  throw new Error(
    'Could not detect bank format. Please use a bank-specific import function.'
  );
}

