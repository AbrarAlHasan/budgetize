-- Composite indexes for better query performance on large datasets
-- These indexes help with common query patterns in reports

-- Index for date range queries with deleted_at filter (most common pattern)
CREATE INDEX IF NOT EXISTS idx_transactions_date_deleted ON transactions(date, deleted_at);

-- Index for date range queries with deleted_at and type filter
CREATE INDEX IF NOT EXISTS idx_transactions_date_deleted_type ON transactions(date, deleted_at, type);

-- Index for account_id + date queries (common in reports)
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date, deleted_at);

-- Index for category_id + date queries
CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date, deleted_at);

-- Index for type + date queries (for filtering expenses/income)
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date, deleted_at);

