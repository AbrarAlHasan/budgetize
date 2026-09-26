import { logInfo, logWarn } from "@/utils/logger";
import { sliceParser } from "./parsers/slice";
import { ParsedTransaction, ReceiptParser } from "./types";

/**
 * Registry of all available receipt/screenshot parsers.
 *
 * To add a new format:
 *   1. Create a new parser file in `parsers/` (e.g. `parsers/gpay.ts`)
 *   2. Implement the `ReceiptParser` interface
 *   3. Import and add it to this array
 */
const PARSERS: ReceiptParser[] = [
  sliceParser,
  // Future parsers go here:
  // gpayParser,
  // phonePeParser,
  // paytmParser,
];

/** Minimum confidence threshold to consider a parser viable */
const MIN_CONFIDENCE = 0.3;

interface ParseResult {
  /** The extracted transaction data (null if no parser matched) */
  data: ParsedTransaction | null;
  /** Name of the parser that was used (null if none matched) */
  parserUsed: string | null;
  /** Confidence score of the winning parser */
  confidence: number;
}

/**
 * Run all registered parsers against the OCR output and return data
 * from the best-matching one.
 *
 * @param ocrLines - Array of text lines from `expo-text-extractor`
 */
export function parseReceipt(ocrLines: string[]): ParseResult {
  if (ocrLines.length === 0) {
    logWarn("[ReceiptParser] empty OCR output — nothing to parse");
    return { data: null, parserUsed: null, confidence: 0 };
  }

  logInfo(`[ReceiptParser] evaluating ${PARSERS.length} parsers against ${ocrLines.length} lines`);

  // Score every parser
  let bestParser: ReceiptParser | null = null;
  let bestScore = 0;

  for (const parser of PARSERS) {
    const score = parser.confidence(ocrLines);
    logInfo(`[ReceiptParser]   ${parser.name}: ${score.toFixed(2)}`);

    if (score > bestScore) {
      bestScore = score;
      bestParser = parser;
    }
  }

  // Check threshold
  if (!bestParser || bestScore < MIN_CONFIDENCE) {
    logWarn(
      `[ReceiptParser] no parser reached minimum confidence (${MIN_CONFIDENCE}). ` +
      `Best was ${bestParser?.name ?? "none"} at ${bestScore.toFixed(2)}`
    );
    return { data: null, parserUsed: null, confidence: bestScore };
  }

  logInfo(
    `[ReceiptParser] winner: ${bestParser.name} (confidence ${bestScore.toFixed(2)})`
  );

  const data = bestParser.parse(ocrLines);
  return { data, parserUsed: bestParser.name, confidence: bestScore };
}
