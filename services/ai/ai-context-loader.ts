import { accountRepository } from '@/repositories/account.repository';
import { categoryRepository } from '@/repositories/category.repository';
import { tagRepository } from '@/repositories/tag.repository';

export interface AiEntityContext {
  categories: Array<{ id: number; name: string }>;
  accounts: Array<{ id: number; name: string; type: string }>;
  tags: Array<{ id: number; name: string }>;
}

export async function loadAiEntityContext(): Promise<AiEntityContext> {
  const [categories, accounts, tags] = await Promise.all([
    categoryRepository.findAll(),
    accountRepository.findAll(),
    tagRepository.findAll(),
  ]);

  const [decryptedCategories, decryptedAccounts, decryptedTags] = await Promise.all([
    categoryRepository.decryptCategories(categories),
    accountRepository.decryptAccounts(accounts),
    tagRepository.decryptTags(tags),
  ]);

  return {
    categories: decryptedCategories.map((c) => ({ id: c.id, name: c.name })),
    accounts: decryptedAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
    })),
    tags: decryptedTags.map((t) => ({ id: t.id, name: t.name })),
  };
}

export function formatEntityContextForPrompt(context: AiEntityContext): string {
  const categories =
    context.categories.length > 0
      ? context.categories.map((c) => `${c.id}=${c.name}`).join(', ')
      : 'none';
  const accounts =
    context.accounts.length > 0
      ? context.accounts.map((a) => `${a.id}=${a.name}(${a.type})`).join(', ')
      : 'none';
  const tags =
    context.tags.length > 0 ? context.tags.map((t) => `${t.id}=${t.name}`).join(', ') : 'none';

  return `Categories (id=name): ${categories}
Accounts (id=name(type)): ${accounts}
Tags (id=name): ${tags}`;
}
