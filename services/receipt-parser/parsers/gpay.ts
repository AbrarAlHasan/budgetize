import { logInfo, logWarn } from "@/utils/logger";
import { ParsedTransaction, ReceiptParser } from "../types";

/**
 * Parser for **Google Pay (GPay)** UPI payment screenshots (India).
 *
 * Typical OCR lines from a GPay payment confirmation:
 *   "To CUMTA"
 *   "₹32"
 *   "Completed"
 *   "30 Sept 2026, 7:51pm"
 *   "Slice Small Finance Bank 1308"
 *   "Payment of ₹32 completed. Receiver's bank has confirmed..."
 *   "UPI transaction ID"
 *   "663941488350"
 *   "To"
 *   "CUMTA"
 *   "....erpg@axb"
 *   "From"
 *   "ABRAR AL HASAN (Slice Small Finance Bank)"
 *   "....11-2@okaxis on Google Pay"
 *   "Google transaction ID"
 *   "CICAgPjSvI6eQQ"
 *   "G Pay"
 */

// ─── Keyword sets used for confidence scoring ────────────────────────────────

/** Markers that strongly identify a Google Pay screenshot */
const STRONG_MARKERS = [
  "google pay",
  "google transaction id",
  "on google pay",
  "g pay",
  "gpay",
] as const;

const SUPPORTING_MARKERS = [
  "upi transaction id",
  "completed",
  "payment of",
  "powered by upi",
] as const;

// ─── Amount helpers ──────────────────────────────────────────────────────────

/** Currency markers OCR commonly produces for ₹ (including mangled glyphs). */
const CURRENCY_MARKER = "(?:₹|rs\\.?|inr|%|\\$)";

/**
 * Normalize common OCR amount glitches before parsing:
 *   "130.OO" → "130.00"   "130 00" → "130.00"
 */
function normalizeAmountText(text: string): string {
  return text
    .trim()
    .replace(/(\d)[Oo]{1,2}\b/g, "$100")
    .replace(/(\d)[Oo]{2}/g, "$100")
    .replace(/(\d+)\s+(\d{2})\b/, "$1.$2");
}

/**
 * Parse a cleaned numeric amount string. Rejects non-amounts like UPI IDs
 * (too many digits) and non-positive values.
 */
function parseAmountValue(raw: string): number | undefined {
  const cleaned = normalizeAmountText(raw).replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  // UPI / Google txn IDs are long digit strings — never treat as amounts
  const intDigits = cleaned.split(".")[0].length;
  if (intDigits > 7) return undefined;

  const value = parseFloat(cleaned);
  return isNaN(value) || value <= 0 ? undefined : value;
}

/**
 * Extracts a numeric amount from a line that contains a currency marker.
 *
 * Handles:
 *   "₹32"  "₹1,275"  "Rs 32"  "Payment of ₹32 completed"
 *   "Payment of %32 completed"  (₹ misread as %)
 *   "732" when OCR turns ₹ into a leading 7 (guarded)
 */
function extractAmountFromLine(line: string): number | undefined {
  const normalized = normalizeAmountText(line);

  // Currency marker + number (incl. OCR-mangled ₹ → % / $)
  const currencyRegex = new RegExp(
    `${CURRENCY_MARKER}\\s*([\\d,]+(?:\\.\\d{1,2})?)`,
    "i",
  );
  const currencyMatch = normalized.match(currencyRegex);
  if (currencyMatch) {
    const value = parseAmountValue(currencyMatch[1]);
    if (value !== undefined) return value;
  }

  // "Payment of 32 completed" — currency glyph fully dropped
  const paymentOfMatch = normalized.match(
    /payment\s+of\s+([\d,]+(?:\.\d{1,2})?)/i,
  );
  if (paymentOfMatch) {
    const value = parseAmountValue(paymentOfMatch[1]);
    if (value !== undefined) return value;
  }

  // OCR sometimes reads ₹ as a leading "7": "7280" for ₹280.
  // Only apply when there is no comma after 7 (so "7,280" stays untouched).
  const rupeeAsSeven = normalized.match(
    /(?:^|[^\d,])7(\d{1,7}(?:\.\d{1,2})?)(?:\D|$)/,
  );
  if (rupeeAsSeven && !/,/.test(rupeeAsSeven[1])) {
    // Prefer this only on short "amount-like" lines, not bank account lines
    if (normalized.trim().length <= 12) {
      const value = parseAmountValue(rupeeAsSeven[1]);
      if (value !== undefined) return value;
    }
  }

  return undefined;
}

/**
 * Parse a standalone number string like "32" or "1,275.50".
 * Returns undefined if the string isn't a clean number.
 */
function parseStandaloneNumber(text: string): number | undefined {
  return parseAmountValue(text);
}

/** True when a line is the GPay status row ("Completed" / "© Completed"). */
function isCompletedStatusLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  // Avoid matching the longer "Payment of … completed" sentence
  if (/payment\s+of/i.test(trimmed)) return false;
  return /\bcompleted\b/.test(trimmed);
}

/**
 * Extract the transaction amount from OCR lines.
 *
 * Real device OCR often drops the ₹ glyph entirely, e.g.:
 *   "To CUMTA" / "32" / "© Completed" / "Payment of %32 completed"
 *
 * Priority:
 *   1. Hero amount-only line ("₹32" or bare "32" before Completed)
 *   2. "Payment of …" confirmation sentence
 *   3. Any currency-marked amount in the hero / full text
 *   4. Two-line match: currency symbol then number
 *   5. Standalone number immediately after the Completed status row
 */
function extractAmount(lines: string[]): number | undefined {
  const detailLabelIndex = lines.findIndex((line) =>
    /upi\s*transaction\s*id|google\s*transaction\s*id/i.test(line),
  );
  const completedIndex = lines.findIndex((line) =>
    isCompletedStatusLine(line),
  );
  const heroEnd =
    completedIndex > 0
      ? completedIndex
      : detailLabelIndex > 0
        ? detailLabelIndex
        : lines.length;
  const heroLines = lines.slice(0, heroEnd);

  // --- Strategy 1a: short hero amount-only lines (with or without ₹) ---
  for (const line of heroLines) {
    const trimmed = normalizeAmountText(line);
    const isLikelyHero =
      new RegExp(`^${CURRENCY_MARKER}\\s*[\\d,]+(?:\\.\\d{1,2})?$`, "i").test(
        trimmed,
      ) ||
      new RegExp(`^[\\d,]+(?:\\.\\d{1,2})?\\s*${CURRENCY_MARKER}$`, "i").test(
        trimmed,
      ) ||
      // Bare number — common when OCR drops ₹ on the large hero amount
      /^[\d,]+(?:\.\d{1,2})?$/.test(trimmed);

    if (!isLikelyHero) continue;

    const amount =
      extractAmountFromLine(trimmed) ?? parseStandaloneNumber(trimmed);
    if (amount !== undefined) {
      logInfo(
        `[GPayParser] amount via hero amount-only match: ${amount} ("${line.trim()}")`,
      );
      return amount;
    }
  }

  // --- Strategy 1b: "Payment of …" (handles missing / mangled ₹) ---
  for (const line of lines) {
    if (!/payment\s+of/i.test(line)) continue;
    const amount = extractAmountFromLine(line);
    if (amount !== undefined) {
      logInfo(
        `[GPayParser] amount via Payment-of match: ${amount} ("${line.trim()}")`,
      );
      return amount;
    }
  }

  // --- Strategy 2: any currency-marked amount in hero, then full text ---
  for (const region of [heroLines, lines]) {
    for (const line of region) {
      const amount = extractAmountFromLine(line);
      if (amount !== undefined) {
        logInfo(
          `[GPayParser] amount via currency match: ${amount} ("${line.trim()}")`,
        );
        return amount;
      }
    }
  }

  // --- Strategy 3: currency marker on one line, number on the next ---
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i].trim();
    if (
      new RegExp(`^${CURRENCY_MARKER}$`, "i").test(current) ||
      /^[₹%]$/.test(current)
    ) {
      const nextVal = parseStandaloneNumber(lines[i + 1]);
      if (nextVal !== undefined) {
        logInfo(
          `[GPayParser] amount via two-line match: ${nextVal} ("${current}" + "${lines[i + 1].trim()}")`,
        );
        return nextVal;
      }
    }
  }

  // --- Strategy 4: standalone number after the Completed status row ---
  if (completedIndex >= 0) {
    for (let i = completedIndex + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      const val = parseStandaloneNumber(trimmed);
      if (val !== undefined) {
        logInfo(
          `[GPayParser] amount via post-Completed match: ${val} ("${trimmed}")`,
        );
        return val;
      }
      break;
    }
  }

  return undefined;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Month abbreviation → 0-indexed month number */
const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parse GPay date formats:
 *   "30 Sept 2026, 7:51pm"
 *   "30 Sep 2026, 7:51 pm"
 *   "30 September 2026"
 *   "Sept 30, 2026, 7:51pm"  (less common US-style OCR)
 *
 * Returns an ISO date string (YYYY-MM-DD) or undefined.
 */
function extractGPayDate(line: string): string | undefined {
  // DD Mon YYYY  (time optional)
  const dmyRegex =
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+'?(\d{2,4})/i;
  const dmyMatch = line.match(dmyRegex);
  if (dmyMatch) {
    return buildIsoDate(dmyMatch[1], dmyMatch[2], dmyMatch[3]);
  }

  // Mon DD, YYYY  (time optional)
  const mdyRegex =
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+'?(\d{2,4})/i;
  const mdyMatch = line.match(mdyRegex);
  if (mdyMatch) {
    return buildIsoDate(mdyMatch[2], mdyMatch[1], mdyMatch[3]);
  }

  return undefined;
}

function buildIsoDate(
  dayStr: string,
  monthStr: string,
  yearStr: string,
): string | undefined {
  const day = parseInt(dayStr, 10);
  const month = MONTH_MAP[monthStr.toLowerCase().slice(0, 3)];
  if (month === undefined) return undefined;

  let year = parseInt(yearStr, 10);
  if (year < 100) year += 2000;

  if (day < 1 || day > 31 || year < 2000 || year > 2099) return undefined;

  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// ─── Merchant / note helpers ─────────────────────────────────────────────────

/**
 * Extract the payee / merchant name.
 *
 * GPay screenshots usually show:
 *   1. Header: "To CUMTA"  (preferred)
 *   2. Details block: label "To" on one line, name on the next
 *
 * Avoids treating the bare "To" label as a merchant.
 */
function extractMerchant(lines: string[]): string | undefined {
  // Prefer header-style "To <Name>" / "To: CUMTA" (name on same line)
  for (const line of lines) {
    const trimmed = line.trim();
    const toMatch = trimmed.match(/^to[:\s]+(.+)/i);
    if (toMatch) {
      const merchant = cleanMerchantName(toMatch[1]);
      // Skip if this looks like a UPI ID rather than a display name
      if (merchant && !merchant.includes("@")) {
        return merchant;
      }
    }
  }

  // Fallback: "To" / "To:" label followed by name on the next non-empty line
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^to:?$/i.test(lines[i].trim())) continue;

    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const candidate = cleanMerchantName(lines[j]);
      if (!candidate) continue;
      // Skip UPI IDs and common labels
      if (candidate.includes("@")) continue;
      if (/^(from|upi|google|payment)/i.test(candidate)) continue;
      return candidate;
    }
  }

  return undefined;
}

function cleanMerchantName(raw: string): string | undefined {
  let merchant = raw.trim();
  // Strip leading colon leftovers from "To: Name" splits
  merchant = merchant.replace(/^[:\s]+/, "");
  // Strip trailing ellipsis / dots from truncated OCR
  merchant = merchant.replace(/\.{2,}$/, "").trim();
  // Strip trailing parenthetical bank info if OCR glued it oddly
  merchant = merchant.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (merchant.length === 0) return undefined;
  return merchant;
}

// ─── UPI ID helper ───────────────────────────────────────────────────────────

/**
 * Extract the recipient UPI ID.
 *
 * GPay often masks IDs as "....erpg@axb" and may append " on Google Pay"
 * on the sender line — we strip that suffix and prefer the "To" block ID.
 */
function extractUpiId(lines: string[]): string | undefined {
  // Allow OCR-mangled masks: "....erpg@axb", "s-erpg@axb", "++++11-2@okaxis"
  const upiPattern =
    /((?:[\.+*]{2,}[a-z0-9._-]*)|(?:[a-z0-9._+-]{2,}))@([a-z0-9._-]+)/i;

  // Prefer UPI ID that appears after a "To" section and before "From"
  const toIndex = lines.findIndex((l) => /^to\b/i.test(l.trim()));
  const fromIndex = lines.findIndex((l) => /^from\b/i.test(l.trim()));

  const searchRanges: Array<[number, number]> = [];
  if (toIndex >= 0) {
    const end = fromIndex > toIndex ? fromIndex : lines.length;
    searchRanges.push([toIndex, end]);
  }
  searchRanges.push([0, lines.length]); // full fallback

  for (const [start, end] of searchRanges) {
    for (let i = start; i < end; i++) {
      // Normalize "....11-2@okaxis on Google Pay"
      const normalized = lines[i]
        .trim()
        .replace(/\s+on\s+google\s+pay\s*$/i, "");
      const match = normalized.match(upiPattern);
      if (match) {
        return `${match[1]}@${match[2]}`;
      }
    }
  }

  return undefined;
}

// ─── Reference helpers ───────────────────────────────────────────────────────

/**
 * Prefer the numeric UPI transaction ID (closest to Slice RRN).
 * Fall back to Google transaction ID when UPI ID is missing.
 */
function cleanReferenceToken(raw: string): string | undefined {
  // OCR often appends trailing punctuation: "663941488350,"
  const cleaned = raw.trim().replace(/[^\w]+$/g, "").replace(/^[^\w]+/g, "");
  if (!cleaned || !/^[A-Za-z0-9]+$/.test(cleaned)) return undefined;
  return cleaned;
}

function extractReferenceNumber(lines: string[]): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Label and value on the same line
    const sameLine = line.match(
      /upi\s*transaction\s*id[:\s]+([A-Za-z0-9]+)/i,
    );
    if (sameLine) {
      const token = cleanReferenceToken(sameLine[1]);
      if (token) return token;
    }

    // Label on one line, value on the next
    if (/^upi\s*transaction\s*id:?$/i.test(line)) {
      const token = cleanReferenceToken(lines[i + 1] ?? "");
      if (token) return token;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const sameLine = line.match(
      /google\s*transaction\s*id[:\s]+([A-Za-z0-9]+)/i,
    );
    if (sameLine) {
      const token = cleanReferenceToken(sameLine[1]);
      if (token) return token;
    }

    if (/^google\s*transaction\s*id:?$/i.test(line)) {
      const token = cleanReferenceToken(lines[i + 1] ?? "");
      if (token) return token;
    }
  }

  return undefined;
}

// ─── Payment mode helper ─────────────────────────────────────────────────────

function extractPaymentMode(lines: string[]): string {
  const joined = lines.join(" ").toLowerCase();
  if (joined.includes("upi")) {
    return "Google Pay (UPI)";
  }
  return "Google Pay";
}

// ─── Transaction type helper ─────────────────────────────────────────────────

/**
 * GPay "To <payee>" confirmations are outgoing expenses.
 * Received-money screens typically lead with "From <payer>" / "Received".
 */
function extractTransactionType(
  lines: string[],
): NonNullable<ParsedTransaction["type"]> {
  const joined = lines.join(" ").toLowerCase();

  if (
    /\breceived\b/.test(joined) ||
    /\bmoney\s+received\b/.test(joined) ||
    (/\bfrom\b/.test(joined) && !/\bto\b/.test(joined))
  ) {
    return "income";
  }

  return "expense";
}

// ─── Parser implementation ───────────────────────────────────────────────────

export const gpayParser: ReceiptParser = {
  name: "gpay",

  confidence(lines: string[]): number {
    const joined = lines.join(" ").toLowerCase();

    let score = 0;

    for (const marker of STRONG_MARKERS) {
      if (joined.includes(marker)) score += 0.25;
    }

    for (const marker of SUPPORTING_MARKERS) {
      if (joined.includes(marker)) score += 0.1;
    }

    // Cap at 1.0
    const finalScore = Math.min(score, 1.0);

    logInfo(
      `[GPayParser] confidence: ${finalScore.toFixed(2)} (from ${lines.length} lines)`,
    );

    return finalScore;
  },

  parse(lines: string[]): ParsedTransaction {
    logInfo(`[GPayParser] parsing ${lines.length} OCR lines`);

    const result: ParsedTransaction = {
      type: extractTransactionType(lines),
    };

    result.amount = extractAmount(lines);

    for (const line of lines) {
      const date = extractGPayDate(line);
      if (date) {
        result.date = date;
        break;
      }
    }

    result.note = extractMerchant(lines);
    result.upiId = extractUpiId(lines);
    result.referenceNumber = extractReferenceNumber(lines);
    result.paymentMode = extractPaymentMode(lines);

    if (!result.amount) {
      logWarn("[GPayParser] could not extract amount from OCR lines");
    }

    logInfo(
      `[GPayParser] parsed result: amount=${result.amount}, date=${result.date}, note=${result.note}, mode=${result.paymentMode}`,
    );

    return result;
  },
};
