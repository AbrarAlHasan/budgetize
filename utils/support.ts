import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export interface DeviceInfo {
  appVersion: string;
  buildNumber: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  osName: string;
  osVersion: string;
  platform: string;
  isDevice: boolean;
  brand: string | null;
  manufacturer: string | null;
  totalMemory: number | null;
}

/**
 * Gathers comprehensive device and app information for support/debugging purposes
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceInfo: DeviceInfo = {
    appVersion: Application.nativeApplicationVersion || Constants.expoConfig?.version || "Unknown",
    buildNumber: Application.nativeBuildVersion || Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || null,
    deviceName: Device.deviceName || null,
    deviceModel: Device.modelName || Device.modelId || null,
    osName: Device.osName || Platform.OS,
    osVersion: Device.osVersion || Platform.Version.toString(),
    platform: Platform.OS,
    isDevice: Device.isDevice,
    brand: Device.brand || null,
    manufacturer: Device.manufacturer || null,
    totalMemory: Device.totalMemory || null,
  };

  return deviceInfo;
}

/**
 * Formats device information into a readable string for email body
 */
export function formatDeviceInfoForEmail(deviceInfo: DeviceInfo): string {
  const lines: string[] = [
    "Device Information:",
    "===================",
    "",
    `App Version: ${deviceInfo.appVersion}`,
  ];

  if (deviceInfo.buildNumber) {
    lines.push(`Build Number: ${deviceInfo.buildNumber}`);
  }

  lines.push(
    "",
    `Platform: ${deviceInfo.platform}`,
    `OS: ${deviceInfo.osName} ${deviceInfo.osVersion}`
  );

  if (deviceInfo.deviceName) {
    lines.push(`Device Name: ${deviceInfo.deviceName}`);
  }

  if (deviceInfo.deviceModel) {
    lines.push(`Device Model: ${deviceInfo.deviceModel}`);
  }

  if (deviceInfo.brand) {
    lines.push(`Brand: ${deviceInfo.brand}`);
  }

  if (deviceInfo.manufacturer) {
    lines.push(`Manufacturer: ${deviceInfo.manufacturer}`);
  }

  if (deviceInfo.totalMemory) {
    lines.push(`Total Memory: ${(deviceInfo.totalMemory / (1024 * 1024 * 1024)).toFixed(2)} GB`);
  }

  lines.push(
    `Is Physical Device: ${deviceInfo.isDevice ? "Yes" : "No"}`,
    "",
    "Please describe your issue below:",
    ""
  );

  return lines.join("\n");
}

/**
 * Opens the default email client with pre-filled recipient and body
 * Uses mailto: scheme which works across all platforms and will open
 * the user's default email client (Gmail if set as default)
 */
export async function openSupportEmail(deviceInfo?: DeviceInfo): Promise<void> {
  const info = deviceInfo || (await getDeviceInfo());
  const emailBody = formatDeviceInfoForEmail(info);
  const recipient = "budgetize.app@gmail.com";
  const subject = encodeURIComponent("Support Request - Budgetize App");
  const body = encodeURIComponent(emailBody);

  // Use standard mailto: scheme - works on all platforms
  // Will open default email client (Gmail if set as default)
  const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
  
  try {
    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
    } else {
      throw new Error("No email client is available");
    }
  } catch (error) {
    // If mailto: fails, try Gmail app directly on iOS
    if (Platform.OS === "ios") {
      const gmailUrl = `googlegmail://co?to=${recipient}&subject=${subject}&body=${body}`;
      try {
        const canOpenGmail = await Linking.canOpenURL(gmailUrl);
        if (canOpenGmail) {
          await Linking.openURL(gmailUrl);
          return;
        }
      } catch {
        // Fall through to error
      }
    }
    
    throw new Error("No email client is available. Please install an email app or configure one in your device settings.");
  }
}

