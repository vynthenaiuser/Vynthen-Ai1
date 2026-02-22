/**
 * Supabase Server Client - Edge Runtime Compatible
 * 
 * This module provides Supabase client instances for server-side use
 * that work in both Node.js and Cloudflare Edge runtime.
 * 
 * For Edge runtime (Cloudflare Pages), we use the standard Supabase client
 * with fetch-based requests (no Node.js dependencies).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create a Supabase client for use in API routes
 * Works in both Node.js and Edge runtime
 */
export function createServerClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // Don't persist sessions on server
      autoRefreshToken: false,
    },
  });
}

/**
 * Create a Supabase admin client with service role key
 * Use this for operations that bypass RLS
 */
export function createAdminClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role key');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Extract user from authorization header
 * Works with both Bearer tokens and cookies
 */
export async function getUserFromRequest(
  req: Request,
  supabase: SupabaseClient
): Promise<{ id: string; email?: string } | null> {
  // Try to get user from Authorization header
  const authHeader = req.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return null;
      }
      
      return {
        id: user.id,
        email: user.email,
      };
    } catch {
      return null;
    }
  }
  
  // Try to get user from cookies (for SSR)
  const cookieHeader = req.headers.get('cookie');
  
  if (cookieHeader) {
    // Parse cookies to find the auth token
    const cookies = parseCookies(cookieHeader);
    const accessToken = cookies['sb-access-token'] || cookies['access_token'];
    
    if (accessToken) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        if (error || !user) {
          return null;
        }
        
        return {
          id: user.id,
          email: user.email,
        };
      } catch {
        return null;
      }
    }
  }
  
  return null;
}

/**
 * Parse cookies from cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name && valueParts.length > 0) {
      cookies[name.trim()] = valueParts.join('=').trim();
    }
  });
  
  return cookies;
}

/**
 * Database table types for Supabase
 */
export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  engine: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

/**
 * Helper to check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}
