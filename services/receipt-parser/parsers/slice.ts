import { logInfo, logWarn } from "@/utils/logger";
import { ParsedTransaction, ReceiptParser } from "../types";

/**
 * Parser for **Slice** (RuPay Credit on UPI) payment screenshots.
 *
 * Typical OCR lines from a Slice payment confirmation:
 *   "PAID SECURELY ON"
 *   "slice"
 *   "PAYMENT SUCCESSFUL"
 *   "₹275"
 *   "To Nellai Department S..."
 *   "paytm.s2u3es9@pty"
 *   "26 Aug '26, 08:00 am"
 *   "From slice CC"
 *   "xx4947"
 *   "RRN: 623833435812"
 *   "RuPay"
 *   "UPI"
 */

// ─── Keyword sets used for confidence scoring ────────────────────────────────

const STRONG_MARKERS = [
  "paid securely on",
  "slice",
  "from slice cc",
  "rupay",
] as const;

const SUPPORTING_MARKERS = ["payment successful", "rrn:", "upi"] as const;

// ─── Amount helpers ──────────────────────────────────────────────────────────

/**
 * Extracts a numeric amount from a single line that contains a rupee symbol or
 * rupee-like prefix. Returns `undefined` when no match is found.
 *
 * Handles:
 *   "₹275"  "₹1,275"  "₹ 1,275.50"  "Rs 275"  "Rs. 1,275"  "INR 275"
 */
function extractAmountFromLine(line: string): number | undefined {
  // Match ₹ / Rs / Rs. / INR followed by optional space and number
  const amountRegex = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const match = line.match(amountRegex);
  if (!match) return undefined;

  const raw = match[1].replace(/,/g, "");
  const value = parseFloat(raw);
  return isNaN(value) ? undefined : value;
}

/**
 * Parse a standalone number string like "380" or "1,275.50".
 * Returns undefined if the string isn't a clean number.
 */
function parseStandaloneNumber(text: string): number | undefined {
  const cleaned = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const value = parseFloat(cleaned);
  return isNaN(value) || value <= 0 ? undefined : value;
}

/**
 * Extract the transaction amount from OCR lines.
 *
 * OCR engines often split the Slice hero amount across lines, e.g.:
 *   Line N:   "₹"  or  "2"  (rupee symbol alone, or even garbled)
 *   Line N+1: "380"
 *
 * Strategy (in priority order):
 *   1. Single-line match: "₹380", "Rs 1,275", etc.
 *   2. Two-line match: a line with ₹/Rs/INR followed by a standalone number
 *   3. Contextual: a standalone number right after "PAYMENT SUCCESSFUL"
 */
function extractAmount(lines: string[]): number | undefined {
  // --- Strategy 1: single-line currency + number ---
  for (const line of lines) {
    const amount = extractAmountFromLine(line);
    if (amount !== undefined) {
      logInfo(
        `[SliceParser] amount via single-line match: ${amount} ("${line.trim()}")`,
      );
      return amount;
    }
  }

  // --- Strategy 2: ₹ on one line, number on the next ---
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i].trim();
    // Check if this line is just a currency symbol (possibly with whitespace)
    if (/^[₹]$|^rs\.?$/i.test(current) || /^inr$/i.test(current)) {
      const nextVal = parseStandaloneNumber(lines[i + 1]);
      if (nextVal !== undefined) {
        logInfo(
          `[SliceParser] amount via two-line match: ${nextVal} ("${current}" + "${lines[i + 1].trim()}")`,
        );
        return nextVal;
      }
    }
  }

  // --- Strategy 3: standalone number after "PAYMENT SUCCESSFUL" ---
  let seenPaymentSuccessful = false;
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.includes("payment successful")) {
      seenPaymentSuccessful = true;
      continue;
    }
    if (seenPaymentSuccessful) {
      const val = parseStandaloneNumber(line);
      if (val !== undefined) {
        logInfo(
          `[SliceParser] amount via post-PAYMENT-SUCCESSFUL match: ${val} ("${line.trim()}")`,
        );
        return val;
      }
      // Also try stripping any leading non-digit chars OCR might have added
      const stripped = line.trim().replace(/^[^\d,]+/, "");
      if (stripped !== line.trim()) {
        const strippedVal = parseStandaloneNumber(stripped);
        if (strippedVal !== undefined) {
          logInfo(
            `[SliceParser] amount via stripped post-PAYMENT-SUCCESSFUL match: ${strippedVal} ("${line.trim()}" → "${stripped}")`,
          );
          return strippedVal;
        }
      }
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
 * Parse Slice date format: "26 Aug '26, 08:00 am"
 * Also handles:  "26 Aug 2026, 08:00 am"  /  "26 Aug '26"
 * Returns an ISO date string (YYYY-MM-DD) or undefined.
 */
function extractSliceDate(line: string): string | undefined {
  // Pattern: DD Mon 'YY  or  DD Mon YYYY  (time part is optional)
  const dateRegex =
    /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+'?(\d{2,4})/i;
  const match = line.match(dateRegex);
  if (!match) return undefined;

  const day = parseInt(match[1], 10);
  const monthStr = match[2].toLowerCase().slice(0, 3);
  const month = MONTH_MAP[monthStr];
  if (month === undefined) return undefined;

  let year = parseInt(match[3], 10);
  // Two-digit year → assume 2000s
  if (year < 100) year += 2000;

  // Basic sanity check
  if (day < 1 || day > 31 || year < 2000 || year > 2099) return undefined;

  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// ─── Merchant / note helpers ─────────────────────────────────────────────────

/**
 * Extract the merchant / payee name from lines.
 * Looks for "To <merchant>" pattern typical in Slice screenshots.
 */
function extractMerchant(lines: string[]): string | undefined {
  for (const line of lines) {
    const trimmed = line.trim();
    // "To Nellai Department S..."
    const toMatch = trimmed.match(/^to\s+(.+)/i);
    if (toMatch) {
      let merchant = toMatch[1].trim();
      // Clean trailing ellipsis or dots
      merchant = merchant.replace(/\.{2,}$/, "").trim();
      if (merchant.length > 0) return merchant;
    }
  }
  return undefined;
}

// ─── UPI ID helper ───────────────────────────────────────────────────────────

function extractUpiId(lines: string[]): string | undefined {
  for (const line of lines) {
    // UPI IDs follow the pattern: something@something
    const upiMatch = line.trim().match(/^([a-z0-9._-]+@[a-z0-9._-]+)$/i);
    if (upiMatch) return upiMatch[1];
  }
  return undefined;
}

// ─── RRN / Reference helper ─────────────────────────────────────────────────

function extractRRN(lines: string[]): string | undefined {
  for (const line of lines) {
    const rrnMatch = line.match(/rrn[:\s]+(\d+)/i);
    if (rrnMatch) return rrnMatch[1];
  }
  return undefined;
}

// ─── Payment mode helper ─────────────────────────────────────────────────────

function extractPaymentMode(lines: string[]): string | undefined {
  const joined = lines.join(" ").toLowerCase();

  if (joined.includes("from slice cc") || joined.includes("rupay")) {
    return "Slice Credit Card (UPI)";
  }
  if (joined.includes("upi")) {
    return "UPI";
  }
  return undefined;
}

// ─── Parser implementation ───────────────────────────────────────────────────

export const sliceParser: ReceiptParser = {
  name: "slice",

  confidence(lines: string[]): number {
    const joined = lines.join(" ").toLowerCase();

    // GPay receipts often mention "Slice Small Finance Bank" as the funding
    // account. Those screenshots belong to the GPay parser — bail out early
    // so we don't mis-claim them via the generic "slice" marker.
    const gpayExclusiveMarkers = [
      "google pay",
      "google transaction id",
      "on google pay",
      "g pay",
      "gpay",
    ];
    if (gpayExclusiveMarkers.some((marker) => joined.includes(marker))) {
      logInfo(
        "[SliceParser] confidence: 0.00 (GPay markers detected — deferring)",
      );
      return 0;
    }

    let score = 0;

    // Strong markers worth 0.25 each (max 1.0 from strong alone)
    for (const marker of STRONG_MARKERS) {
      if (joined.includes(marker)) score += 0.25;
    }

    // Supporting markers worth 0.1 each
    for (const marker of SUPPORTING_MARKERS) {
      if (joined.includes(marker)) score += 0.1;
    }

    // Cap at 1.0
    const finalScore = Math.min(score, 1.0);

    logInfo(
      `[SliceParser] confidence: ${finalScore.toFixed(2)} (from ${lines.length} lines)`,
    );

    return finalScore;
  },

  parse(lines: string[]): ParsedTransaction {
    logInfo(`[SliceParser] parsing ${lines.length} OCR lines`);

    const result: ParsedTransaction = {
      type: "expense", // Slice payments are always expenses
    };

    // --- Amount ---
    result.amount = extractAmount(lines);

    // --- Date ---
    for (const line of lines) {
      const date = extractSliceDate(line);
      if (date) {
        result.date = date;
        break;
      }
    }

    // --- Merchant / Note ---
    result.note = extractMerchant(lines);

    // --- UPI ID ---
    result.upiId = extractUpiId(lines);

    // --- RRN ---
    result.referenceNumber = extractRRN(lines);

    // --- Payment Mode ---
    result.paymentMode = extractPaymentMode(lines);

    if (!result.amount) {
      logWarn("[SliceParser] could not extract amount from OCR lines");
    }

    logInfo(
      `[SliceParser] parsed result: amount=${result.amount}, date=${result.date}, note=${result.note}, mode=${result.paymentMode}`,
    );

    return result;
  },
};
