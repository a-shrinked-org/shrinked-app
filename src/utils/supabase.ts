import { createClient as _createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Server-side Supabase client for Route Handlers and Server Components
export const createClient = () => {
  const cookieStore = cookies();

  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
        remove: (name: string, options: any) => cookieStore.set(name, '', options),
      },
    }
  );
};

// Client-side Supabase client for browser environments
export const createBrowserClient = () => {
  return _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};
