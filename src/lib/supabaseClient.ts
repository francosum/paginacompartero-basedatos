import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const fallbackSupabaseUrl = "https://xvfhankyffjgdhvvifjb.supabase.co";
const fallbackSupabaseAnonKey = "sb_publishable_4XZj8G9M0iEm9d3XqmFavA_jIqiXfu2";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() || fallbackSupabaseUrl;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || fallbackSupabaseAnonKey;

const isPlaceholder = (value?: string) =>
  !value ||
  value.includes("TU-") ||
  value.includes("TU_") ||
  value.includes("your-project") ||
  value.includes("example");

export const isSupabaseConfigured =
  !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
