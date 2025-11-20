import { Account } from '@/db/schema/types';
import { getDatabase } from '@/db/sqlite/db';
import { accountRepository } from '@/repositories/account.repository';
import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';
import { transactionRepository } from '@/repositories/transaction.repository';

const MONTHS_TO_GENERATE = 12;
const MONTHLY_MIN_TOTAL = 10000;
const MONTHLY_MAX_TOTAL = 30000;
const MONTH_WITHOUT_TRANSACTIONS_OFFSET = 5; // e.g., 5 months ago (zero data)
const WEEKDAY_WITHOUT_TRANSACTIONS = 0; // 0 = Sunday (skip all Sundays)

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

function buildRandomDateExcludingWeekday(
  monthOffset: number,
  excludeWeekday: number | null
): string {
  const now = new Date();

  for (let attempt = 0; attempt < 40; attempt++) {
    const day = 1 + Math.floor(Math.random() * 28);
    const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
    if (excludeWeekday !== null && date.getDay() === excludeWeekday) {
      continue;
    }
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  }

  // Fallback: force a weekday different than excludeWeekday
  const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
  if (excludeWeekday !== null) {
    while (date.getDay() === excludeWeekday) {
      date.setDate(date.getDate() + 1);
    }
  }
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
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
  tagMap: Map<string, number>
): Promise<number> {
  let transactionCount = 0;

  for (let monthOffset = 0; monthOffset < MONTHS_TO_GENERATE; monthOffset++) {
    if (monthOffset === MONTH_WITHOUT_TRANSACTIONS_OFFSET) {
      console.log(
        `[dummy-data] Skipping month offset ${monthOffset} to simulate zero-transaction month.`
      );
      continue;
    }

    const monthlyTarget = randomBetween(MONTHLY_MIN_TOTAL, MONTHLY_MAX_TOTAL, 0);
    let monthlyTotal = 0;

    // Income transactions for non-credit accounts
    for (const account of accounts) {
      if (account.type === 'credit') {
        continue;
      }

      const incomeCategory = pickRandomItem(INCOME_CATEGORIES);
      const incomeAmount = randomBetween(2500, 6000);
      const incomeDate = buildRandomDateExcludingWeekday(
        monthOffset,
        WEEKDAY_WITHOUT_TRANSACTIONS
      );

      await transactionRepository.create({
        account_id: account.id,
        category_id: categoryMap.get(incomeCategory) ?? null,
        amount: incomeAmount,
        type: 'income',
        date: incomeDate,
        note: `${incomeCategory} payout`,
        payment_mode: 'bank-transfer',
        tag_ids: pickRandomTags(tagMap, 1),
      });

      monthlyTotal += incomeAmount;
      transactionCount++;
    }

    // Expense transactions until monthly total is within desired range
    let safetyCounter = 0;
    while (monthlyTotal < monthlyTarget && safetyCounter < 200) {
      safetyCounter++;

      const account = pickRandomItem(accounts);
      const expenseCategory = pickRandomItem(EXPENSE_CATEGORIES);
      const expenseAmount = randomBetween(
        40,
        account.type === 'credit' ? 700 : 450
      );
      const expenseDate = buildRandomDateExcludingWeekday(
        monthOffset,
        WEEKDAY_WITHOUT_TRANSACTIONS
      );

      await transactionRepository.create({
        account_id: account.id,
        category_id: categoryMap.get(expenseCategory) ?? null,
        amount: expenseAmount,
        type: 'expense',
        date: expenseDate,
        note: `${expenseCategory} expense`,
        payment_mode: pickRandomItem(PAYMENT_MODES),
        tag_ids: pickRandomTags(tagMap, 2),
      });

      monthlyTotal += expenseAmount;
      transactionCount++;
    }
  }

  return transactionCount;
}

export async function resetAppWithDummyData(): Promise<DummySeedSummary> {
  await clearExistingData();

  // Run sequentially to avoid overlapping transactions on SQLite
  const categoryMap = await seedCategories();
  const tagMap = await seedTags();
  const accounts = await seedAccounts();

  const transactions = await seedTransactions(accounts, categoryMap, tagMap);

  return {
    accounts: accounts.length,
    transactions,
    categories: categoryMap.size,
    tags: tagMap.size,
  };
}


