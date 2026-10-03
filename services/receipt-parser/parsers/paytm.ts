import { logInfo, logWarn } from "@/utils/logger";
import { ParsedTransaction, ReceiptParser } from "../types";

/**
 * Parser for **Paytm** UPI payment screenshots (India).
 *
 * Typical OCR lines from a Paytm "Money Sent Successfully" receipt:
 *   "paytm"
 *   "Money Sent Successfully"
 *   "₹400"
 *   "Rupees Four Hundred Only"
 *   "To:"
 *   "Vijayakumar S"
 *   "UPI ID: vijaykumar19942@okaxis"
 *   "From:"
 *   "Prabhakar Nagarajan"
 *   "UPI ID: ******8062@ptyes"
 *   "HDFC Bank - 5974"
 *   "UPI Ref No: 316009094670"
 *   "07:34 PM, 02 Oct 2026"
 *   "Powered by UPI"
 *   "YES BANK"
 */

// ─── Keyword sets used for confidence scoring ────────────────────────────────

const STRONG_MARKERS = [
  "money sent successfully",
  "money received successfully",
  "upi ref no",
] as const;

const SUPPORTING_MARKERS = [
  "powered by upi",
  "yes bank",
  "rupees",
  "upi id:",
] as const;

// ─── Amount helpers ──────────────────────────────────────────────────────────

const CURRENCY_MARKER = "(?:₹|rs\\.?|inr)";

function normalizeAmountText(text: string): string {
  return text
    .trim()
    .replace(/(\d)[Oo]{1,2}\b/g, "$100")
    .replace(/(\d)[Oo]{2}/g, "$100")
    .replace(/(\d+)\s+(\d{2})\b/, "$1.$2");
}

function parseAmountValue(raw: string): number | undefined {
  const cleaned = normalizeAmountText(raw).replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;

  // UPI Ref Nos are long digit strings — never treat as amounts
  const intDigits = cleaned.split(".")[0].length;
  if (intDigits > 7) return undefined;

  const value = parseFloat(cleaned);
  return isNaN(value) || value <= 0 ? undefined : value;
}

function extractAmountFromLine(line: string): number | undefined {
  const normalized = normalizeAmountText(line);
  const currencyRegex = new RegExp(
    `${CURRENCY_MARKER}\\s*([\\d,]+(?:\\.\\d{1,2})?)`,
    "i",
  );
  const match = normalized.match(currencyRegex);
  if (!match) return undefined;
  return parseAmountValue(match[1]);
}

function parseStandaloneNumber(text: string): number | undefined {
  return parseAmountValue(text);
}

/** True when a line is the Paytm success status row. */
function isSuccessStatusLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  return (
    /money\s+sent\s+successfully/.test(trimmed) ||
    /money\s+received\s+successfully/.test(trimmed) ||
    /payment\s+successful/.test(trimmed)
  );
}

/**
 * Extract the transaction amount from OCR lines.
 *
 * Priority:
 *   1. Hero amount near the success status ("₹400")
 *   2. Any currency-marked amount (skipping "Rupees … Only" / ref lines)
 *   3. Two-line match: currency symbol then number
 *   4. Standalone number immediately after the success status
 */
function extractAmount(lines: string[]): number | undefined {
  const statusIndex = lines.findIndex((line) => isSuccessStatusLine(line));
  const refIndex = lines.findIndex((line) => /upi\s*ref\s*no/i.test(line));
  const heroEnd =
    refIndex > 0
      ? refIndex
      : statusIndex >= 0
        ? Math.min(statusIndex + 6, lines.length)
        : Math.min(8, lines.length);
  const heroStart = statusIndex >= 0 ? statusIndex : 0;
  const heroLines = lines.slice(heroStart, heroEnd);

  // --- Strategy 1: short hero amount-only lines ---
  for (const line of heroLines) {
    const trimmed = normalizeAmountText(line);
    if (/^rupees\b/i.test(trimmed)) continue;

    const isLikelyHero =
      new RegExp(`^${CURRENCY_MARKER}\\s*[\\d,]+(?:\\.\\d{1,2})?$`, "i").test(
        trimmed,
      ) ||
      new RegExp(`^[\\d,]+(?:\\.\\d{1,2})?\\s*${CURRENCY_MARKER}$`, "i").test(
        trimmed,
      ) ||
      /^[\d,]+(?:\.\d{1,2})?$/.test(trimmed);

    if (!isLikelyHero) continue;

    const amount =
      extractAmountFromLine(trimmed) ?? parseStandaloneNumber(trimmed);
    if (amount !== undefined) {
      logInfo(
        `[PaytmParser] amount via hero amount-only match: ${amount} ("${line.trim()}")`,
      );
      return amount;
    }
  }

  // --- Strategy 2: any currency-marked amount in hero, then full text ---
  for (const region of [heroLines, lines]) {
    for (const line of region) {
      if (/^rupees\b/i.test(line.trim())) continue;
      if (/upi\s*ref\s*no/i.test(line)) continue;
      const amount = extractAmountFromLine(line);
      if (amount !== undefined) {
        logInfo(
          `[PaytmParser] amount via currency match: ${amount} ("${line.trim()}")`,
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
      /^[₹]$/.test(current)
    ) {
      const nextVal = parseStandaloneNumber(lines[i + 1]);
      if (nextVal !== undefined) {
        logInfo(
          `[PaytmParser] amount via two-line match: ${nextVal} ("${current}" + "${lines[i + 1].trim()}")`,
        );
        return nextVal;
      }
    }
  }

  // --- Strategy 4: standalone number after success status ---
  if (statusIndex >= 0) {
    for (let i = statusIndex + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      if (/^rupees\b/i.test(trimmed)) continue;
      const val = parseStandaloneNumber(trimmed);
      if (val !== undefined) {
        logInfo(
          `[PaytmParser] amount via post-status match: ${val} ("${trimmed}")`,
        );
        return val;
      }
      // Stop after first non-empty non-amount line past status
      if (extractAmountFromLine(trimmed) === undefined) break;
    }
  }

  return undefined;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

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
 * Parse Paytm date formats:
 *   "07:34 PM, 02 Oct 2026"
 *   "02 Oct 2026, 07:34 PM"
 *   "02 Oct 2026"
 *
 * Returns an ISO date string (YYYY-MM-DD) or undefined.
 */
function extractPaytmDate(line: string): string | undefined {
  // Time-first: "07:34 PM, 02 Oct 2026"
  const timeFirstRegex =
    /\d{1,2}:\d{2}\s*(?:am|pm)\s*,?\s*(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+'?(\d{2,4})/i;
  const timeFirstMatch = line.match(timeFirstRegex);
  if (timeFirstMatch) {
    return buildIsoDate(timeFirstMatch[1], timeFirstMatch[2], timeFirstMatch[3]);
  }

  // Date-first: "02 Oct 2026" (time optional, before or after)
  const dmyRegex =
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+'?(\d{2,4})/i;
  const dmyMatch = line.match(dmyRegex);
  if (dmyMatch) {
    return buildIsoDate(dmyMatch[1], dmyMatch[2], dmyMatch[3]);
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
 * Extract the payee / merchant name from the "To:" block.
 *
 * Paytm screenshots usually show:
 *   "To:"
 *   "Vijayakumar S"
 *   "UPI ID: …"
 */
function extractMerchant(lines: string[]): string | undefined {
  // Same-line: "To: Vijayakumar S" / "To Vijayakumar S"
  for (const line of lines) {
    const trimmed = line.trim();
    const toMatch = trimmed.match(/^to[:\s]+(.+)/i);
    if (toMatch) {
      const merchant = cleanMerchantName(toMatch[1]);
      if (merchant && !merchant.includes("@") && !/^upi\b/i.test(merchant)) {
        return merchant;
      }
    }
  }

  // Label on one line, name on the next
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^to:?$/i.test(lines[i].trim())) continue;

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const candidate = cleanMerchantName(lines[j]);
      if (!candidate) continue;
      if (candidate.includes("@")) continue;
      if (/^(from|upi|paytm|rupees|hdfc|yes\s*bank)/i.test(candidate)) continue;
      return candidate;
    }
  }

  return undefined;
}

function cleanMerchantName(raw: string): string | undefined {
  let merchant = raw.trim();
  merchant = merchant.replace(/^[:\s]+/, "");
  merchant = merchant.replace(/\.{2,}$/, "").trim();
  merchant = merchant.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (merchant.length === 0) return undefined;
  return merchant;
}

// ─── UPI ID helper ───────────────────────────────────────────────────────────

/**
 * Extract the recipient UPI ID from the "To" block.
 * Handles labeled lines ("UPI ID: foo@bar") and masked IDs ("******8062@ptyes").
 */
function extractUpiId(lines: string[]): string | undefined {
  const upiPattern =
    /((?:\*{2,}|\.{2,}|\+{2,})?[a-z0-9._*-]*)@([a-z0-9._-]+)/i;

  const toIndex = lines.findIndex((l) => /^to\b/i.test(l.trim()));
  const fromIndex = lines.findIndex((l) => /^from\b/i.test(l.trim()));

  const searchRanges: Array<[number, number]> = [];
  if (toIndex >= 0) {
    const end = fromIndex > toIndex ? fromIndex : lines.length;
    searchRanges.push([toIndex, end]);
  }
  searchRanges.push([0, lines.length]);

  for (const [start, end] of searchRanges) {
    for (let i = start; i < end; i++) {
      const line = lines[i].trim();

      // Prefer explicit "UPI ID:" labeled values
      const labeled = line.match(
        /upi\s*id[:\s]+((?:\*{2,}|\.{2,}|\+{2,})?[a-z0-9._*-]*@[a-z0-9._-]+)/i,
      );
      if (labeled) return labeled[1];

      const match = line.match(upiPattern);
      if (match) {
        return `${match[1]}@${match[2]}`;
      }
    }
  }

  return undefined;
}

// ─── Reference helpers ───────────────────────────────────────────────────────

function cleanReferenceToken(raw: string): string | undefined {
  const cleaned = raw.trim().replace(/[^\w]+$/g, "").replace(/^[^\w]+/g, "");
  if (!cleaned || !/^[A-Za-z0-9]+$/.test(cleaned)) return undefined;
  return cleaned;
}

function extractReferenceNumber(lines: string[]): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const sameLine = line.match(/upi\s*ref\s*no[:\s]+([A-Za-z0-9]+)/i);
    if (sameLine) {
      const token = cleanReferenceToken(sameLine[1]);
      if (token) return token;
    }

    if (/^upi\s*ref\s*no:?$/i.test(line)) {
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
    return "Paytm (UPI)";
  }
  return "Paytm";
}

// ─── Transaction type helper ─────────────────────────────────────────────────

function extractTransactionType(
  lines: string[],
): NonNullable<ParsedTransaction["type"]> {
  const joined = lines.join(" ").toLowerCase();

  if (
    /money\s+received\s+successfully/.test(joined) ||
    /\bmoney\s+received\b/.test(joined) ||
    (/\breceived\b/.test(joined) && !/\bsent\b/.test(joined))
  ) {
    return "income";
  }

  return "expense";
}

/** Logo line OCR'd as exactly "paytm" (avoids matching paytm.*@ UPI handles). */
function hasStandalonePaytmLogo(lines: string[]): boolean {
  return lines.some((line) => /^paytm$/i.test(line.trim()));
}

// ─── Parser implementation ───────────────────────────────────────────────────

export const paytmParser: ReceiptParser = {
  name: "paytm",

  confidence(lines: string[]): number {
    const joined = lines.join(" ").toLowerCase();

    // Defer when another app's exclusive markers dominate
    const foreignExclusiveMarkers = [
      "google pay",
      "google transaction id",
      "on google pay",
      "g pay",
      "paid securely on",
      "from slice cc",
    ];
    if (foreignExclusiveMarkers.some((marker) => joined.includes(marker))) {
      logInfo(
        "[PaytmParser] confidence: 0.00 (foreign app markers detected — deferring)",
      );
      return 0;
    }

    let score = 0;

    for (const marker of STRONG_MARKERS) {
      if (joined.includes(marker)) score += 0.3;
    }

    if (hasStandalonePaytmLogo(lines)) {
      score += 0.3;
    }

    for (const marker of SUPPORTING_MARKERS) {
      if (joined.includes(marker)) score += 0.1;
    }

    const finalScore = Math.min(score, 1.0);

    logInfo(
      `[PaytmParser] confidence: ${finalScore.toFixed(2)} (from ${lines.length} lines)`,
    );

    return finalScore;
  },

  parse(lines: string[]): ParsedTransaction {
    logInfo(`[PaytmParser] parsing ${lines.length} OCR lines`);

    const result: ParsedTransaction = {
      type: extractTransactionType(lines),
    };

    result.amount = extractAmount(lines);

    for (const line of lines) {
      const date = extractPaytmDate(line);
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
      logWarn("[PaytmParser] could not extract amount from OCR lines");
    }

    logInfo(
      `[PaytmParser] parsed result: amount=${result.amount}, date=${result.date}, note=${result.note}, mode=${result.paymentMode}`,
    );

    return result;
  },
};
