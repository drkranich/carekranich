import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const PUBLIC_SUPABASE_URL = 'https://zyljrtmukcniwiloiwra.supabase.co';
const PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aYsxT5_9aX7Bo2f8nr86YA_0P_EdAfK';

function readProcessEnv(name: string) {
  if (typeof process === 'undefined') return undefined;
  return process.env?.[name];
}

function createSupabaseClient() {
  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL ||
    readProcessEnv('SUPABASE_URL') ||
    PUBLIC_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    readProcessEnv('SUPABASE_PUBLISHABLE_KEY') ||
    PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['VITE_SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['VITE_SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Configure them in the app environment.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
