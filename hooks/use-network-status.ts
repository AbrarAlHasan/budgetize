import * as Network from "expo-network";
import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuthStore } from "@/store/auth-store";

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

/**
 * Hook to detect network connectivity status
 * Automatically updates when network state changes
 * Triggers auth session check when network becomes available
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: null,
  });
  const previousNetworkStatus = useRef<boolean>(false);

  const checkNetworkStatus = async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const isAvailable = networkState.isConnected && networkState.isInternetReachable !== false;
      
      setNetworkStatus({
        isConnected: networkState.isConnected ?? false,
        isInternetReachable: networkState.isInternetReachable ?? false,
      });

      // If network just became available (was offline, now online), check session
      if (isAvailable && !previousNetworkStatus.current) {
        // Network just came online, check session in background
        const { checkSession } = useAuthStore.getState();
        checkSession(true).catch((error) => {
          console.error('Error checking session after network came online:', error);
        });
      }

      previousNetworkStatus.current = isAvailable;
    } catch (error) {
      // If network check fails, assume offline
      setNetworkStatus({
        isConnected: false,
        isInternetReachable: false,
      });
      previousNetworkStatus.current = false;
    }
  };

  useEffect(() => {
    // Check initial network status
    checkNetworkStatus();

    // Set up interval to check network status periodically
    const interval = setInterval(checkNetworkStatus, 3000); // Check every 3 seconds

    // Also check when app comes to foreground
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkNetworkStatus();
        }
      }
    );

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    ...networkStatus,
    // Helper to check if network is available for cloud operations
    isNetworkAvailable:
      networkStatus.isConnected && networkStatus.isInternetReachable !== false,
  };
}
