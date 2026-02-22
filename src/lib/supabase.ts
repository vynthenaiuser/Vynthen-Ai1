/**
 * Supabase Client - Edge Compatible
 * 
 * This module provides Supabase client instances that work in both
 * Node.js and Cloudflare Edge runtime.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase client (for auth)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as unknown as SupabaseClient;

// Server-side admin client (for database operations)
// Edge-compatible: uses fetch-based requests
export const supabaseAdmin = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null as unknown as SupabaseClient;

// Types for our database
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}
