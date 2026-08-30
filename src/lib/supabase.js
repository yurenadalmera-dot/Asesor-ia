import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://dlgektvoodffhjlnpggj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_p2ZkOWaoebz5M3yx2rpIRg_fomai3hp';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
