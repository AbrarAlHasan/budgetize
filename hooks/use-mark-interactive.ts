import { useObserve } from "expo-observe";
import { useEffect } from "react";

/**
 * Marks the current screen (or app entry surface) as interactive for EAS Observe TTI.
 * Safe to call multiple times; only the first call per scope is recorded.
 */
export function useMarkInteractive(): void {
  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);
}
