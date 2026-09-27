import { create } from "zustand";

/**
 * Transient store that buffers an image shared into the app via the OS share
 * sheet (through `expo-share-intent`).
 *
 * Why a store and not just a route param:
 *   A share intent can arrive while the app is still behind a blocking gate
 *   (onboarding not complete, security lock screen, or the update screen). At
 *   that point the main navigation `<Stack>` isn't mounted yet, so we cannot
 *   navigate to the add-expense screen. We buffer the shared image URI here and
 *   the root layout consumes it (navigates + hands it off) only once every gate
 *   has cleared.
 *
 * This state is deliberately NOT persisted — a share intent is a one-shot,
 * session-scoped event and must never survive an app restart.
 */
interface ShareIntentStore {
  /** URI of the image shared into the app, or null when there's nothing pending */
  pendingImageUri: string | null;
  /** Buffer a shared image URI to be processed once the app is unblocked */
  setPendingImageUri: (uri: string | null) => void;
  /** Consume + clear the pending image URI (returns it if present) */
  consumePendingImageUri: () => string | null;
  /** Clear any pending shared image without consuming */
  clearPendingImageUri: () => void;
}

export const useShareIntentStore = create<ShareIntentStore>((set, get) => ({
  pendingImageUri: null,

  setPendingImageUri: (uri: string | null) => {
    set({ pendingImageUri: uri });
  },

  consumePendingImageUri: (): string | null => {
    const uri = get().pendingImageUri;
    if (uri) {
      set({ pendingImageUri: null });
    }
    return uri;
  },

  clearPendingImageUri: () => {
    set({ pendingImageUri: null });
  },
}));
