Expense Tracker – Local-First, Encrypted (Expo + SQLite + TanStack Query)
A fully offline-first, end-to-end encrypted personal expense tracker app built using React Native (Expo
Prebuild), expo-sqlite, and TanStack Query.
The app works entirely without internet or login, but is designed with a future-ready architecture for
optional Supabase sync.
TECH STACK
Core
- React Native (Expo Prebuild)
- TypeScript
- expo-router navigation
- expo-sqlite (local database)
- @tanstack/react-query (caching & queries)
- Zustand (UI state only)
- expo-secure-store + expo-crypto (encryption)
- NativeWind or Tamagui (UI)
- React Native Reanimated
Architecture
- Local-first, offline-first
- Repository pattern for data access
- SQLite + encryption
- TanStack Query for data fetching, caching, invalidation
- Sync-ready models (remote_id, is_synced, updated_at)
FOLDER STRUCTURE
app/
_layout.tsx
index.tsx
accounts/
expenses/
reports/
dashboard/
components/
db/
schema/
migrations/
sqlite/
db.ts
queries.ts
repositories/
hooks/
services/
store/
utils/
types/
ENCRYPTION
All sensitive values saved to SQLite must be encrypted using:
- Expo SecureStore → holds encryption key
- Expo Crypto → performs AES encryption/decryption
Encrypted fields include:
- transaction amount
- transaction note
- payment mode
- card numbers (if any)
- borrowed/lent names (optional)
DATABASE SCHEMA (SQLite)
ACCOUNTS TABLE:
id, name, type, bank_name, credit_limit, billing_start_date, billing_end_date, payment_due_date,
created_at, updated_at, deleted_at, remote_id, is_synced
TRANSACTIONS TABLE:
id, account_id, amount (encrypted), type, date, note (encrypted), payment_mode (encrypted),
created_at, updated_at, deleted_at, remote_id, is_synced
TAGS TABLE:
id, name, created_at, updated_at, deleted_at, remote_id, is_synced
TRANSACTION_TAGS TABLE:
transaction_id, tag_id
BUSINESS LOGIC
Accounts:
- Debit card accounts
- Credit card accounts (billing cycle + credit limit)
- Borrowed money accounts
- Lent money accounts
Transactions:
- Add expenses and income
- Select payment mode (account)
- Add reusable tags
- Encrypted notes
- Stored locally in SQLite
HOME DASHBOARD
- Current month spending
- Monthly transactions list
- Tag/category breakdown
REPORT SCREEN
- Date range filter
- Cached with React Query
APP BEHAVIOR
- Offline-first
- Encrypted SQLite
- React Query caching + optimistic updates
- Sync-ready model structure
DEVELOPMENT STEPS (CURSOR)
1. Setup Expo Prebuild project
2. Setup expo-sqlite, react-query, secure-store, crypto, zustand
3. Implement SQLite wrapper + migrations
4. Implement repositories with encryption
5. Implement React Query hooks
6. Implement UI (accounts, transactions, reports, dashboard)
FINAL OUTPUT
A fully offline, encrypted expense tracker with:
- SQLite local storage
- TanStack Query caching
- Modular architecture
- Secure encrypted data
- Ready for future Supabase sync