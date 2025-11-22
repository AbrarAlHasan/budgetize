import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';

// Default categories that users commonly need
const DEFAULT_CATEGORIES = [
  // Expense Categories
  'Food & Dining',
  'Transport',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Fitness',
  'Travel',
  'Groceries',
  'Subscriptions',
  'Education',
  'Personal Care',
  'Home & Garden',
  'Insurance',
  'Taxes',
  'Other',
  // Income Categories
  'Salary',
  'Freelance',
  'Investments',
  'Business',
  'Gift',
];

// Default tags that users commonly need
const DEFAULT_TAGS = [
  'Personal',
  'Work',
  'Family',
  'Urgent',
  'Recurring',
  'One-time',
  'Business',
  'Tax Deductible',
  'Entertainment',
  'Essential',
];

/**
 * Seeds default categories and tags for new users
 * This is called when a user chooses "Start Fresh" in onboarding
 */
export async function seedDefaultCategoriesAndTags(): Promise<void> {
  try {
    // Seed categories
    for (const categoryName of DEFAULT_CATEGORIES) {
      try {
        await categoryRepository.create({ name: categoryName });
      } catch (error) {
        // Category might already exist, ignore error
        console.log(`Category "${categoryName}" might already exist, skipping...`);
      }
    }

    // Seed tags
    for (const tagName of DEFAULT_TAGS) {
      try {
        await tagRepository.create({ name: tagName });
      } catch (error) {
        // Tag might already exist, ignore error
        console.log(`Tag "${tagName}" might already exist, skipping...`);
      }
    }

    console.log('✓ Default categories and tags seeded successfully');
  } catch (error) {
    console.error('Error seeding default categories and tags:', error);
    throw error;
  }
}

