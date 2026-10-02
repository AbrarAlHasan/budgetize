import { useShareIntentStore } from "@/store/share-intent-store";
import { logInfo, logWarn } from "@/utils/logger";
import { router } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { useEffect, useRef } from "react";

/** Route that consumes a shared image and runs extraction */
const ADD_EXPENSE_ROUTE = "/expenses/add";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp"];

interface SharedFileLike {
  path?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
}

function isImageFile(file: SharedFileLike): boolean {
  if (file.mimeType?.startsWith("image/")) {
    return true;
  }

  const name = (file.fileName ?? file.path ?? "").toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Bridges `expo-share-intent` into the app's blocking flow.
 *
 * Responsibilities (single concern: routing a shared image safely):
 *   1. When an IMAGE is shared into the app, buffer its URI in the
 *      share-intent store and immediately reset the native share intent so it
 *      can't fire twice.
 *   2. Only navigate to the add-expense screen once the app is fully
 *      unblocked (`isUnblocked` — onboarding complete, authenticated, no
 *      update screen). Until then the image stays buffered.
 *
 * Non-image shares (text, url, files that aren't images) are ignored here —
 * this feature only handles payment-screenshot images.
 *
 * @param isUnblocked Whether the app has cleared every blocking gate
 *                    (loading, lock screen, update screen, onboarding).
 */
export function useShareIntentHandler(isUnblocked: boolean): void {
  const { hasShareIntent, shareIntent, resetShareIntent } =
    useShareIntentContext();
  const setPendingImageUri = useShareIntentStore(
    (state) => state.setPendingImageUri,
  );
  const pendingImageUri = useShareIntentStore(
    (state) => state.pendingImageUri,
  );

  // Guard against navigating repeatedly for the same buffered image.
  const navigatedForUriRef = useRef<string | null>(null);

  // ── 1. Capture an incoming shared image ────────────────────────────────
  useEffect(() => {
    if (!hasShareIntent) return;

    const files = shareIntent.files ?? [];
    const firstImage = files.find((file) => isImageFile(file));

    if (firstImage?.path) {
      logInfo(
        `[ShareIntent] received shared image: ${firstImage.fileName ?? firstImage.path} (mime=${firstImage.mimeType ?? "unknown"}, type=${shareIntent.type})`,
      );
      setPendingImageUri(firstImage.path);
    } else {
      logWarn(
        `[ShareIntent] ignoring non-image share (type=${shareIntent.type}, files=${files.length}, text=${shareIntent.text ? "yes" : "no"})`,
      );
    }

    // Always reset the native intent once captured so it doesn't replay.
    resetShareIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, shareIntent]);

  // ── 2. Navigate once the app is unblocked ──────────────────────────────
  useEffect(() => {
    if (!isUnblocked) return;
    if (!pendingImageUri) return;
    if (navigatedForUriRef.current === pendingImageUri) return;

    navigatedForUriRef.current = pendingImageUri;
    logInfo("[ShareIntent] app unblocked — navigating to add-expense");

    // The add-expense screen reads the pending image from the store on mount.
    router.push(ADD_EXPENSE_ROUTE);
  }, [isUnblocked, pendingImageUri]);

  // Reset the navigation guard when the buffer is cleared so a subsequent
  // share of the same image can navigate again.
  useEffect(() => {
    if (!pendingImageUri) {
      navigatedForUriRef.current = null;
    }
  }, [pendingImageUri]);
}
