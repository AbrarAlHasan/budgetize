import { Account } from '@/db/schema/types';
import { getDatabase } from '@/db/sqlite/db';
import { accountRepository } from '@/repositories/account.repository';
import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { transactionRepository } from '@/repositories/transaction.repository';
import { format } from 'date-fns';
import { log } from '@/utils/logger';

const YEARS_TO_GENERATE = 2; // Generate data for 2 years
const TRANSACTIONS_PER_DAY = 50; // 50 transactions per day
const DAYS_IN_TWO_YEARS = 730; // 2 years = 730 days

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Fitness',
  'Travel',
  'Groceries',
  'Subscriptions',
];

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments'];

const TAG_NAMES = [
  'Personal',
  'Work',
  'Family',
  'Recurring',
  'One-off',
  'Cashback',
  'Essentials',
];

const ACCOUNT_TEMPLATES = [
  {
    name: 'Personal Checking',
    type: 'debit',
    bank_name: 'Chase Bank',
    currency: 'USD',
  },
  {
    name: 'Travel Credit Card',
    type: 'credit',
    bank_name: 'AmEx',
    currency: 'USD',
    credit_limit: 10000,
  },
  {
    name: 'Emergency Savings',
    type: 'debit',
    bank_name: 'Ally Savings',
    currency: 'USD',
  },
] as const;

const PAYMENT_MODES = ['cash', 'card', 'upi', 'bank-transfer', 'online-wallet'];

interface DummySeedSummary {
  accounts: number;
  transactions: number;
  categories: number;
  tags: number;
}

function randomBetween(min: number, max: number, precision = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(precision));
}

function pickRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildRandomTimeForDate(targetDate: Date, isToday: boolean): Date {
  const date = new Date(targetDate);
  
  if (isToday) {
    const now = new Date();
      const maxHours = now.getHours();
      const maxMinutes = now.getMinutes();
    const maxSeconds = now.getSeconds();
    
      const hours = Math.floor(Math.random() * (maxHours + 1));
      const minutes = hours === maxHours 
        ? Math.floor(Math.random() * (maxMinutes + 1))
        : Math.floor(Math.random() * 60);
    const seconds = hours === maxHours && minutes === maxMinutes
      ? Math.floor(Math.random() * (maxSeconds + 1))
      : Math.floor(Math.random() * 60);
    
    date.setHours(hours, minutes, seconds, Math.floor(Math.random() * 1000));
    } else {
      // For past dates, use random time during the day
      date.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60),
      Math.floor(Math.random() * 1000)
    );
  }
  
  return date;
}

function pickRandomTags(tagMap: Map<string, number>, max = 2): number[] | undefined {
  if (tagMap.size === 0) {
    return undefined;
  }

  const tagIds = Array.from(tagMap.values());
  const count = Math.min(max, Math.floor(Math.random() * (max + 1)));
  if (count === 0) {
    return undefined;
  }

  const selected: number[] = [];
  while (selected.length < count) {
    const tagId = pickRandomItem(tagIds);
    if (!selected.includes(tagId)) {
      selected.push(tagId);
    }
  }
  return selected;
}

async function clearExistingData(): Promise<void> {
  const db = await getDatabase();
  const tables = [
    'transaction_tags',
    'transactions',
    'accounts',
    'tags',
    'categories',
  ];

  for (const table of tables) {
    await db.runAsync(`DELETE FROM ${table}`);
  }
}

async function seedCategories(): Promise<Map<string, number>> {
  const categoryMap = new Map<string, number>();
  const uniqueCategories = Array.from(
    new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])
  );

  for (const name of uniqueCategories) {
    const category = await categoryRepository.create({ name });
    categoryMap.set(name, category.id);
  }

  return categoryMap;
}

async function seedTags(): Promise<Map<string, number>> {
  const tagMap = new Map<string, number>();

  for (const name of TAG_NAMES) {
    const tag = await tagRepository.create({ name });
    tagMap.set(name, tag.id);
  }

  return tagMap;
}

async function seedAccounts(): Promise<Account[]> {
  const accounts: Account[] = [];

  for (const template of ACCOUNT_TEMPLATES) {
    const account = await accountRepository.create({
      name: template.name,
      type: template.type,
      bank_name: template.bank_name,
      credit_limit: 'credit_limit' in template ? template.credit_limit ?? null : null,
      currency: template.currency,
    });
    accounts.push(account);
  }

  return accounts;
}

async function seedTransactions(
  accounts: Account[],
  categoryMap: Map<string, number>,
  tagMap: Map<string, number>,
  onProgress?: (progress: number) => void
): Promise<number> {
  let transactionCount = 0;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setFullYear(now.getFullYear() - YEARS_TO_GENERATE);
  startDate.setHours(0, 0, 0, 0);

  log(`[dummy-data] Generating ${TRANSACTIONS_PER_DAY} transactions per day for ${DAYS_IN_TWO_YEARS} days...`);
  log(`[dummy-data] Start date: ${startDate.toISOString()}, End date: ${now.toISOString()}`);

  // Get non-credit accounts for income transactions
  const nonCreditAccounts = accounts.filter(acc => acc.type !== 'credit');
  
  // Process each day
  for (let dayOffset = 0; dayOffset < DAYS_IN_TWO_YEARS; dayOffset++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    
    // Skip if date exceeds today
    if (targetDate > now) {
      break;
    }

    const isToday = targetDate.toDateString() === now.toDateString();
    
    // Calculate and report progress
    const totalDays = Math.min(DAYS_IN_TWO_YEARS, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const progress = Math.min(100, Math.round(((dayOffset + 1) / totalDays) * 100));
    
    // Report progress every 10 days or on the last day
    if (dayOffset % 10 === 0 || dayOffset === totalDays - 1) {
      if (onProgress) {
        onProgress(progress);
      }
      log(`[dummy-data] Progress: ${dayOffset + 1}/${totalDays} days (${progress}%) - ${transactionCount} transactions so far`);
    }

    // Generate income transactions (1-2 per day for non-credit accounts)
    const incomeCount = Math.floor(Math.random() * 2) + 1; // 1-2 income transactions
    for (let i = 0; i < incomeCount && i < nonCreditAccounts.length; i++) {
      const account = pickRandomItem(nonCreditAccounts);
      const incomeCategory = pickRandomItem(INCOME_CATEGORIES);
      const incomeAmount = randomBetween(2500, 6000);
      const incomeDate = buildRandomTimeForDate(targetDate, isToday);

      await transactionRepository.create({
        account_id: account.id,
        category_id: categoryMap.get(incomeCategory) ?? null,
        amount: incomeAmount,
        type: 'income',
        date: format(incomeDate, 'yyyy-MM-dd'),
        note: `${incomeCategory} payout`,
        payment_mode: 'bank-transfer',
        tag_ids: pickRandomTags(tagMap, 1),
      });

      transactionCount++;
    }

    // Generate expense transactions to reach TRANSACTIONS_PER_DAY
    const remainingTransactions = TRANSACTIONS_PER_DAY - incomeCount;
    for (let i = 0; i < remainingTransactions; i++) {
      const account = pickRandomItem(accounts);
      const expenseCategory = pickRandomItem(EXPENSE_CATEGORIES);
      const expenseAmount = randomBetween(
        20,
        account.type === 'credit' ? 800 : 500
      );
      const expenseDate = buildRandomTimeForDate(targetDate, isToday);

      await transactionRepository.create({
        account_id: account.id,
        category_id: categoryMap.get(expenseCategory) ?? null,
        amount: expenseAmount,
        type: 'expense',
        date: format(expenseDate, 'yyyy-MM-dd'),
        note: `${expenseCategory} expense`,
        payment_mode: pickRandomItem(PAYMENT_MODES),
        tag_ids: pickRandomTags(tagMap, 2),
      });

      transactionCount++;
    }
  }

  log(`[dummy-data] Completed! Generated ${transactionCount} transactions.`);
  return transactionCount;
}

export async function resetAppWithDummyData(
  onProgress?: (progress: number) => void
): Promise<DummySeedSummary> {
  if (onProgress) onProgress(5);
  await clearExistingData();

  if (onProgress) onProgress(10);
  // Run sequentially to avoid overlapping transactions on SQLite
  const categoryMap = await seedCategories();
  
  if (onProgress) onProgress(15);
  const tagMap = await seedTags();
  
  if (onProgress) onProgress(20);
  const accounts = await seedAccounts();

  if (onProgress) onProgress(25);
  const transactions = await seedTransactions(accounts, categoryMap, tagMap, (transactionProgress) => {
    // Map transaction progress (0-100) to overall progress (25-100)
    if (onProgress) {
      const overallProgress = 25 + (transactionProgress * 0.75);
      onProgress(Math.round(overallProgress));
    }
  });

  if (onProgress) onProgress(100);

  return {
    accounts: accounts.length,
    transactions,
    categories: categoryMap.size,
    tags: tagMap.size,
  };
}


