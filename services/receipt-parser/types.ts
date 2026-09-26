import { TransactionType } from "@/db/schema/types";

/**
 * Data extracted from a payment screenshot / receipt image.
 * All fields are optional — parsers fill what they can detect.
 */
export interface ParsedTransaction {
  /** Numeric amount (always positive) */
  amount?: number;
  /** Merchant name, payee, or description for the note field */
  note?: string;
  /** ISO date string (YYYY-MM-DD) */
  date?: string;
  /** expense or income */
  type?: TransactionType;
  /** Payment mode label (e.g. "UPI", "Credit Card", "Cash") */
  paymentMode?: string;
  /** Optional UPI ID / reference for debugging */
  upiId?: string;
  /** Optional reference number (RRN, UTR, etc.) */
  referenceNumber?: string;
}

/**
 * Contract every screenshot/receipt parser must implement.
 *
 * Each parser targets a specific app or format (Slice, GPay, PhonePe, etc.).
 * The orchestrator calls `confidence()` on every registered parser and
 * delegates to the one with the highest score.
 */
export interface ReceiptParser {
  /** Human-readable name for logging / debugging */
  name: string;

  /**
   * Return a confidence score between 0 and 1 indicating how well
   * this parser matches the given OCR lines.
   *
   * 0   = definitely not this format
   * 0.5 = might be
   * 1   = very confident
   */
  confidence(lines: string[]): number;

  /**
   * Parse the OCR lines and return whatever transaction data can be extracted.
   * Only called when this parser wins the confidence contest.
   */
  parse(lines: string[]): ParsedTransaction;
}
