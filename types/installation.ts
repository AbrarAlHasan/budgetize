/**
 * TypeScript types for device installation tracking
 */

export interface DeviceInstallation {
  device_id: string;
  first_opened_at: string;
  last_opened_at: string;
  device_name: string | null;
  device_model: string | null;
  os_name: string;
  os_version: string;
  platform: string;
  brand: string | null;
  manufacturer: string | null;
  app_version: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceInstallationInsert {
  device_id: string;
  first_opened_at: string;
  last_opened_at: string;
  device_name?: string | null;
  device_model?: string | null;
  os_name: string;
  os_version: string;
  platform: string;
  brand?: string | null;
  manufacturer?: string | null;
  app_version: string;
}

export interface DeviceInstallationUpdate {
  last_opened_at: string;
  updated_at?: string;
}

