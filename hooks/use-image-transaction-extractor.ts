import { parseReceipt } from "@/services/receipt-parser";
import { ParsedTransaction } from "@/services/receipt-parser/types";
import { logError, logInfo } from "@/utils/logger";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

interface ExtractionResult {
  data: ParsedTransaction;
  parserUsed: string;
}

interface UseImageTransactionExtractorReturn {
  /** Whether OCR + parsing is currently running */
  isExtracting: boolean;
  /** Last extraction result (null until first successful extraction) */
  result: ExtractionResult | null;
  /** Last error message (null when no error) */
  error: string | null;
  /** Pick an image from the gallery and extract transaction data */
  pickAndExtract: () => Promise<ExtractionResult | null>;
  /** Paste an image from the clipboard and extract transaction data */
  pasteAndExtract: () => Promise<ExtractionResult | null>;
  /** Clear the current result / error state */
  reset: () => void;
}

/**
 * Hook that ties together image selection, OCR, and receipt parsing.
 *
 * Provides two entry points:
 *   - `pickAndExtract()` — opens the image picker (gallery)
 *   - `pasteAndExtract()` — reads an image from the clipboard
 *
 * Both run expo-text-extractor OCR and then the receipt parser orchestrator.
 */
export function useImageTransactionExtractor(): UseImageTransactionExtractorReturn {
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Core extraction pipeline ───────────────────────────────────────────

  const runExtraction = useCallback(
    async (imageUri: string): Promise<ExtractionResult | null> => {
      logInfo(`[ImageExtractor] running OCR on: ${imageUri}`);

      // 1. OCR
      const ocrLines = await extractTextFromImage(imageUri);
      logInfo(`[ImageExtractor] OCR returned ${ocrLines.length} lines`);
      logInfo(
        `[ImageExtractor] OCR raw lines:\n${ocrLines.map((l, i) => `  [${i}] "${l}"`).join("\n")}`,
      );

      if (ocrLines.length === 0) {
        const msg = "No text found in the image. Try a clearer screenshot.";
        setError(msg);
        Alert.alert("No Text Found", msg);
        return null;
      }

      // 2. Parse
      const parseResult = parseReceipt(ocrLines);

      if (!parseResult.data || !parseResult.parserUsed) {
        const msg =
          "Could not recognize the payment format. Try a different screenshot.";
        setError(msg);
        Alert.alert("Unrecognized Format", msg);
        return null;
      }

      const extraction: ExtractionResult = {
        data: parseResult.data,
        parserUsed: parseResult.parserUsed,
      };

      setResult(extraction);
      setError(null);
      return extraction;
    },
    [],
  );

  // ── Pick from gallery ──────────────────────────────────────────────────

  const pickAndExtract =
    useCallback(async (): Promise<ExtractionResult | null> => {
      if (!isSupported) {
        Alert.alert(
          "Not Supported",
          "Text extraction is not supported on this device.",
        );
        return null;
      }

      try {
        setIsExtracting(true);
        setError(null);

        // Request permission
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant photo library access to extract text from images.",
          );
          return null;
        }

        // Launch picker
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 1,
          allowsEditing: false,
        });

        if (pickerResult.canceled || pickerResult.assets.length === 0) {
          return null; // User cancelled — not an error
        }

        const imageUri = pickerResult.assets[0].uri;
        return await runExtraction(imageUri);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to extract text from image";
        logError("[ImageExtractor] pickAndExtract error:", err);
        setError(message);
        Alert.alert("Extraction Failed", message);
        return null;
      } finally {
        setIsExtracting(false);
      }
    }, [runExtraction]);

  // ── Paste from clipboard ───────────────────────────────────────────────

  const pasteAndExtract =
    useCallback(async (): Promise<ExtractionResult | null> => {
      if (!isSupported) {
        Alert.alert(
          "Not Supported",
          "Text extraction is not supported on this device.",
        );
        return null;
      }

      try {
        setIsExtracting(true);
        setError(null);

        // Check clipboard for an image
        const hasImage = await Clipboard.hasImageAsync();
        if (!hasImage) {
          Alert.alert(
            "No Image in Clipboard",
            "Copy a payment screenshot first, then tap Paste.",
          );
          return null;
        }

        // Get the image from clipboard as base64
        const clipboardImage = await Clipboard.getImageAsync({ format: "png" });
        if (!clipboardImage || !clipboardImage.data) {
          Alert.alert(
            "Could Not Read Image",
            "Failed to read the image from the clipboard. Try copying it again.",
          );
          return null;
        }

        // expo-text-extractor needs a file URI, so write base64 to a temp file
        const tempFile = new File(
          Paths.cache,
          `clipboard_receipt_${Date.now()}.png`,
        );

        // clipboardImage.data is a data URI like "data:image/png;base64,..."
        // Strip the prefix to get raw base64
        const base64Data = clipboardImage.data.replace(
          /^data:image\/\w+;base64,/,
          "",
        );

        await tempFile.write(base64Data, { encoding: "base64" });

        const extractionResult = await runExtraction(tempFile.uri);

        // Clean up temp file (fire and forget)
        try {
          tempFile.delete();
        } catch {
          /* ignore */
        }

        return extractionResult;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to extract text from clipboard image";
        logError("[ImageExtractor] pasteAndExtract error:", err);
        setError(message);
        Alert.alert("Extraction Failed", message);
        return null;
      } finally {
        setIsExtracting(false);
      }
    }, [runExtraction]);

  // ── Reset ──────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isExtracting,
    result,
    error,
    pickAndExtract,
    pasteAndExtract,
    reset,
  };
}
