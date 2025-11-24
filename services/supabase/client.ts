import { asyncStorage } from "@/storage/mmkv";
import { createClient } from "@supabase/supabase-js";
import { logWarn } from "@/utils/logger";

// Get Supabase URL and anon key from environment variables
// These should be set in app.json extra config or .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  logWarn(
    "Supabase URL or Anon Key not found. Cloud backup features will not work."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: asyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
