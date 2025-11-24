# AI Feature Documentation

## Overview

The AI feature allows users to ask natural language questions about their financial data and get answers by dynamically generating and executing SQL queries. **This implementation uses on-device AI** for complete privacy and offline functionality.

## Features

1. **Natural Language Queries**: Ask questions like:
   - "Give me the sum of transactions for last one month which is categorized with food"
   - "Show me expenses by category"
   - "How much did I spend on transport this year?"

2. **Application-Only Responses**: The AI only answers questions about the Budgetize application (transactions, accounts, categories, tags, financial data). It refuses to answer general knowledge questions.

3. **On-Device AI**: Uses `react-native-executorch` with Llama 3.2 1B model for:
   - Complete privacy (all processing happens on-device)
   - Offline functionality (no internet connection required)
   - Low latency (no network delays)
   - No API costs

4. **Dynamic SQL Generation**: The AI generates SQL queries based on user questions, handling:
   - Category name lookups (since category names are encrypted)
   - Date range calculations
   - Encrypted field handling
   - Safe query execution (read-only, no DROP/DELETE/UPDATE/INSERT)

5. **Automatic Decryption**: Query results automatically decrypt encrypted fields (amounts, names, notes, etc.)

6. **Fallback Pattern Matching**: If the on-device LLM is not ready or fails, the system falls back to intelligent pattern matching for common queries.

## Setup

### On-Device AI Configuration

The AI feature uses `react-native-executorch` which is already configured in the project:

1. **Metro Config**: The metro bundler is configured to handle `.pte` and `.bin` model files (already done in `metro.config.js`)

2. **Model**: Uses Llama 3.2 1B model (LLAMA3_2_1B) which is automatically downloaded when the app first runs

3. **No Additional Setup Required**: The on-device AI works out of the box - no API keys or external services needed!

## How It Works

1. **Model Initialization**: On app start, the on-device LLM (Llama 3.2 1B) is initialized
2. **Question Validation**: Checks if the question is about the application using:
   - Keyword matching (fast fallback)
   - On-device LLM for complex validation (if available)
3. **Query Generation**: 
   - Primary: Uses on-device LLM to generate SQL queries from natural language
   - Fallback: Uses intelligent pattern matching if LLM is not ready or fails
4. **Category Lookup**: If a category name is mentioned, looks up the category ID (since names are encrypted)
5. **Query Execution**: Safely executes the SQL query (read-only)
6. **Decryption**: Decrypts encrypted fields in the results
7. **Response Formatting**: Formats the results into a readable response

## Example Queries

- "Sum of transactions for food category last month"
- "Show me all expenses"
- "Total income this year"
- "Transactions categorized with transport"
- "How much did I spend on shopping last week?"

## Security

- Only SELECT queries are allowed
- Forbidden keywords: DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, etc.
- SQL injection protection
- All queries are validated before execution

## Files

- `app/(tabs)/ai.tsx` - AI chat interface
- `hooks/use-llm.ts` - Hook for on-device LLM integration
- `services/ai.ts` - AI service for query generation (uses on-device LLM)
- `services/query-executor.ts` - Safe SQL query execution and decryption

## Technical Details

### On-Device AI Architecture

- **Library**: `react-native-executorch` (v0.5.15)
- **Model**: Llama 3.2 1B (LLAMA3_2_1B)
- **Model Format**: ExecuTorch (.pte format)
- **Initialization**: Automatic on first use
- **Memory**: Model runs entirely on-device, no data leaves the device

### Performance Considerations

- **First Load**: Model may take a few seconds to initialize on first use
- **Generation Speed**: Depends on device hardware (typically 1-5 seconds per query)
- **Battery**: On-device inference uses device resources but is optimized for efficiency
- **Storage**: Model is downloaded once and cached locally (~2GB)

### Privacy & Security

- ✅ **100% Private**: All processing happens on-device
- ✅ **No Network Required**: Works completely offline
- ✅ **No Data Collection**: No user data is sent anywhere
- ✅ **Encrypted Data**: Handles encrypted database fields securely

