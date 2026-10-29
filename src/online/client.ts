import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase connection, or null when the build has no backend configured.
 * Online features check this and hide themselves, so the game always works offline.
 */
export const supabase: SupabaseClient | null =
  // Default auth settings: the ranked account (anonymous sign-in) stays in this browser.
  url && key ? createClient(url, key) : null;

export const onlineEnabled = supabase !== null;
