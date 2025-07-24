import { createServerClient, createBrowserClient as _createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client for Route Handlers and Server Components
export const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const value = cookieStore.get(name)?.value;
          console.log(`[Supabase Server Client] Getting cookie: ${name}, Value: ${value ? '***' : 'null'}`);
          return value;
        },
        set: (name: string, value: string, options: any) => {
          console.log(`[Supabase Server Client] Setting cookie: ${name}, Value: ${value ? '***' : 'null'}`);
          cookieStore.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          console.log(`[Supabase Server Client] Removing cookie: ${name}`);
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
};

// Client-side Supabase client for browser environments
export const createBrowserClient = () => {
  return _createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
};