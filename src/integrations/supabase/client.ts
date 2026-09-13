import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

/**
 * Browser Supabase client with cookie + localStorage session sync.
 * Cookies enable middleware/proxy auth; localStorage keeps existing client APIs working.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const supabase = createSupabaseBrowserClient();
