// Learn more: https://docs.expo.dev/router/advanced/native-intent/
//
// expo-share-intent wakes the app on iOS with a deep link shaped like:
//   com.budgetize.app://dataUrl=com.budgetize.appShareKey?nonce=...
//
// Because our URL scheme is a dotted / reverse-DNS one, expo-router receives
// this as an unroutable path (`dataUrl=...`) and renders the "Unmatched Route"
// screen. The share payload itself is delivered to `useShareIntent` separately
// (via expo-linking's URL listener + the native module), so this deep link
// must NOT drive navigation.
//
// We intercept it here and redirect to the app root. The share-intent handler
// mounted in the root layout then buffers the shared image and navigates to
// the add-expense screen once the app is unblocked.

const SHARE_INTENT_MARKERS = ["dataurl=", "sharekey"];

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    const normalized = path.toLowerCase();
    const isShareIntent = SHARE_INTENT_MARKERS.every((marker) =>
      normalized.includes(marker),
    );

    if (isShareIntent) {
      // Swallow the share-intent deep link — send the user to the app root
      // instead of the unmatched-route screen. The actual shared image is
      // handled by useShareIntentHandler in app/_layout.tsx.
      return "/";
    }
  } catch {
    // If anything goes wrong parsing the path, fall back to the app root
    // rather than crashing the deep-link handler.
    return "/";
  }

  return path;
}
