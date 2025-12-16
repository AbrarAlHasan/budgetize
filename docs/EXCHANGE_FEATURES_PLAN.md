# Exchange Feature Enhancement Plan

## Current State Analysis

The exchange feature currently supports:
- **Types**: Lent (money you lent) and Borrowed (money you borrowed)
- **Status**: Pending, Paid, Received
- **Fields**: Person name, amount, date, due date, note
- **Features**: Filtering, summary cards, mark as settled, encryption
- **UI**: Clean, minimal design with type-based color coding

---

## Proposed Feature Enhancements

### 1. **Partial Payments/Installments** ⭐ High Priority
**Problem**: Users often receive/lend money in multiple installments, but current system only supports full settlement.

**Solution**:
- Add `installments` table to track partial payments
- Allow multiple partial payments per exchange
- Show progress bar indicating how much has been paid/received
- Auto-mark as settled when total installments equal exchange amount
- Support for scheduled recurring installments

**Database Schema**:
```sql
CREATE TABLE exchange_installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_id INTEGER NOT NULL,
  amount TEXT NOT NULL, -- Encrypted
  payment_date TEXT NOT NULL,
  note TEXT, -- Encrypted
  created_at TEXT NOT NULL,
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
);
```

**UI Features**:
- Installment history timeline
- Progress indicator (e.g., "₹5,000 / ₹10,000 paid")
- Quick "Add Installment" button on exchange detail
- Visual distinction between partial and full settlements

---

### 2. **Recurring/Repeating Exchanges** ⭐ High Priority
**Problem**: Users may have recurring exchanges (e.g., monthly rent, weekly allowance).

**Solution**:
- Add `recurrence_pattern` field (daily, weekly, monthly, yearly)
- Add `recurrence_end_date` or `recurrence_count`
- Auto-generate future exchanges based on pattern
- Link related exchanges in a "series"
- One-time bulk settlement for entire series

**Database Schema**:
```sql
ALTER TABLE exchanges ADD COLUMN recurrence_pattern TEXT CHECK(recurrence_pattern IN ('none', 'daily', 'weekly', 'monthly', 'yearly'));
ALTER TABLE exchanges ADD COLUMN recurrence_end_date TEXT;
ALTER TABLE exchanges ADD COLUMN recurrence_count INTEGER;
ALTER TABLE exchanges ADD COLUMN parent_exchange_id INTEGER; -- For linking series
ALTER TABLE exchanges ADD COLUMN next_recurrence_date TEXT;
```

**UI Features**:
- Toggle for "Recurring" when creating exchange
- Recurrence pattern selector
- Series view showing all related exchanges
- "Generate next occurrence" action
- Bulk actions for series (settle all, cancel series)

---

### 3. **Reminders & Notifications** ⭐ High Priority
**Problem**: Users forget about pending exchanges, especially those with due dates.

**Solution**:
- Due date reminders (configurable: 1 day before, on due date, overdue)
- Periodic reminders for pending exchanges without due dates
- Push notifications integration
- In-app reminder center

**Database Schema**:
```sql
CREATE TABLE exchange_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_id INTEGER NOT NULL,
  reminder_type TEXT CHECK(reminder_type IN ('due_date', 'overdue', 'periodic')),
  reminder_date TEXT NOT NULL,
  is_sent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
);
```

**UI Features**:
- Reminder settings in exchange detail/edit screen
- Reminder preferences in settings
- Notification center showing upcoming reminders
- Snooze functionality

---

### 4. **Exchange Categories/Tags** ⭐ Medium Priority
**Problem**: Users want to categorize exchanges (e.g., "Family", "Friends", "Business", "Emergency").

**Solution**:
- Reuse existing tag system (if available) or create exchange-specific categories
- Filter exchanges by category
- Category-based summaries and reports
- Quick category assignment

**Database Schema**:
```sql
CREATE TABLE exchange_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT, -- Hex color code
  icon TEXT, -- Icon identifier
  created_at TEXT NOT NULL
);

ALTER TABLE exchanges ADD COLUMN category_id INTEGER;
CREATE INDEX idx_exchanges_category ON exchanges(category_id);
```

**UI Features**:
- Category chips/badges on exchange items
- Category filter in main screen
- Category-based summary cards
- Category management screen

---

### 5. **Exchange History & Audit Trail** ⭐ Medium Priority
**Problem**: Users want to see when exchanges were created, modified, or settled.

**Solution**:
- Track all status changes with timestamps
- Show history timeline on exchange detail screen
- Export history for record-keeping

**Database Schema**:
```sql
CREATE TABLE exchange_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('created', 'updated', 'status_changed', 'settled', 'deleted')),
  old_value TEXT, -- JSON for complex changes
  new_value TEXT, -- JSON for complex changes
  changed_by TEXT DEFAULT 'user', -- For future multi-user support
  created_at TEXT NOT NULL,
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
);
```

**UI Features**:
- History timeline component
- Expandable history section in detail view
- Visual indicators for key events (settlement, status change)

---

### 6. **Exchange Analytics & Reports** ⭐ Medium Priority
**Problem**: Users want insights into their lending/borrowing patterns.

**Solution**:
- Monthly/yearly summaries (total lent, total borrowed, net position)
- Person-wise summaries (who owes you most, who you owe most)
- Trend charts (lent vs borrowed over time)
- Settlement rate analytics
- Export reports (PDF/CSV)

**Database Queries** (SQL-first approach):
- Aggregate queries for totals by person, month, year
- Settlement rate calculations
- Average exchange amount and duration

**UI Features**:
- Analytics dashboard tab
- Charts using existing chart components
- Person-wise breakdown cards
- Time period selector (month, quarter, year, all-time)
- Export button

---

### 7. **Quick Actions & Templates** ⭐ Low Priority
**Problem**: Users often create similar exchanges (same person, similar amounts).

**Solution**:
- Save exchange templates
- Quick action buttons for common exchanges
- "Duplicate" exchange feature
- Recent persons autocomplete

**Database Schema**:
```sql
CREATE TABLE exchange_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  person_name TEXT, -- Encrypted
  amount TEXT, -- Encrypted (can be null for variable amounts)
  type TEXT NOT NULL,
  category_id INTEGER,
  note TEXT, -- Encrypted
  recurrence_pattern TEXT,
  created_at TEXT NOT NULL
);
```

**UI Features**:
- Template selector when creating exchange
- "Save as template" option
- Quick action buttons on main screen
- Recent persons dropdown

---

### 8. **Exchange Attachments/Receipts** ⭐ Low Priority
**Problem**: Users want to attach receipts, screenshots, or documents to exchanges.

**Solution**:
- File attachment support (images, PDFs)
- Store file paths/metadata in database
- View attachments in exchange detail
- Optional cloud storage integration

**Database Schema**:
```sql
CREATE TABLE exchange_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exchange_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'pdf', etc.
  file_name TEXT NOT NULL,
  file_size INTEGER, -- Bytes
  created_at TEXT NOT NULL,
  FOREIGN KEY (exchange_id) REFERENCES exchanges(id) ON DELETE CASCADE
);
```

**UI Features**:
- Attachment gallery in exchange detail
- Add attachment button
- Image viewer component
- File size limits and validation

---

### 9. **Exchange Groups/Projects** ⭐ Low Priority
**Problem**: Users may want to group related exchanges (e.g., "Trip to Europe", "Wedding expenses").

**Solution**:
- Create exchange groups/projects
- Link multiple exchanges to a group
- Group-level summaries and analytics
- Archive groups when complete

**Database Schema**:
```sql
CREATE TABLE exchange_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('active', 'archived')) DEFAULT 'active',
  created_at TEXT NOT NULL
);

ALTER TABLE exchanges ADD COLUMN group_id INTEGER;
CREATE INDEX idx_exchanges_group ON exchanges(group_id);
```

**UI Features**:
- Group selector when creating exchange
- Group view showing all related exchanges
- Group summary cards
- Archive/unarchive groups

---

### 10. **Exchange Search & Advanced Filtering** ⭐ Medium Priority
**Problem**: As exchange list grows, finding specific exchanges becomes difficult.

**Solution**:
- Full-text search (person name, note)
- Advanced filters (date range, amount range, category)
- Saved filter presets
- Sort options (date, amount, person name)

**Database Schema**:
```sql
-- Add full-text search index (FTS5)
CREATE VIRTUAL TABLE exchanges_fts USING fts5(
  person_name,
  note,
  content='exchanges',
  content_rowid='id'
);
```

**UI Features**:
- Search bar with real-time results
- Advanced filter modal
- Filter chips showing active filters
- Sort dropdown
- Saved filter presets

---

## Implementation Priority Matrix

### Phase 1: Core Enhancements (High Impact, High Priority)
1. **Partial Payments/Installments** - Solves real-world use case
2. **Reminders & Notifications** - Prevents forgotten exchanges
3. **Exchange Search & Advanced Filtering** - Essential for usability

### Phase 2: Power Features (Medium Impact, Medium Priority)
4. **Recurring/Repeating Exchanges** - Useful for regular patterns
5. **Exchange Analytics & Reports** - Provides valuable insights
6. **Exchange Categories/Tags** - Better organization

### Phase 3: Advanced Features (Lower Priority)
7. **Exchange History & Audit Trail** - Nice to have
8. **Quick Actions & Templates** - Convenience feature
9. **Exchange Attachments/Receipts** - Optional enhancement
10. **Exchange Groups/Projects** - Niche use case

---

## Technical Considerations

### Database Performance
- All aggregations must be done in SQL (not JavaScript)
- Proper indexing for new fields (person_name, category_id, group_id)
- Use transactions for batch operations
- Consider pagination for large exchange lists

### Security & Privacy
- Encrypt all sensitive fields (person_name, amount, note, attachments)
- Maintain encryption consistency with existing system
- Secure file storage for attachments

### UI/UX Principles
- Maintain minimal, professional design aesthetic
- Follow existing design patterns and components
- Ensure accessibility (screen readers, contrast)
- Smooth animations and transitions
- Loading states and error handling

### Code Architecture
- Follow SOLID principles
- Reusable components for common patterns
- Custom hooks for exchange logic
- Repository pattern for database operations
- Type-safe TypeScript throughout

---

## Next Steps

1. **Review & Prioritize**: Review this plan and select features to implement
2. **Database Migrations**: Create migration files for selected features
3. **Repository Updates**: Extend ExchangeRepository with new methods
4. **UI Components**: Build reusable components for new features
5. **Integration**: Integrate new features into existing screens
6. **Testing**: Test all features thoroughly
7. **Documentation**: Update user documentation

---

## Questions to Consider

1. Which features align best with your app's primary use cases?
2. Are there any features from this list you'd like to prioritize differently?
3. Are there additional features you'd like to add that aren't listed here?
4. Should we implement features incrementally or as a batch?

