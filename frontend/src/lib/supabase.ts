import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Create a mock Supabase client when not configured to prevent errors
const createMockClient = (): SupabaseClient => {
  console.warn("Creating mock Supabase client - not configured");
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
        }),
      }),
      insert: () => Promise.resolve({ error: new Error("Supabase not configured") }),
      update: () => ({
        eq: () => Promise.resolve({ error: new Error("Supabase not configured") }),
      }),
    }),
  } as unknown as SupabaseClient;
};

export const supabase: SupabaseClient = (!supabaseUrl || !supabaseAnonKey)
  ? createMockClient() 
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });

export type Profile = {
  id: string;
  email: string;
  name: string;
  language: "en" | "hi";
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
};
