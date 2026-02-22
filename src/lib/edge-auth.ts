/**
 * Edge-Compatible Auth Helper for Cloudflare Pages
 * 
 * This module provides authentication utilities that work in Edge runtime
 * without relying on Node.js specific APIs like next/headers cookies().
 * 
 * Usage:
 * ```typescript
 * import { getAuthenticatedUser, createEdgeSupabase } from '@/lib/edge-auth';
 * 
 * const supabase = createEdgeSupabase(req);
 * const user = await getAuthenticatedUser(req, supabase);
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Parse cookies from a cookie header string
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
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
 * Create a Supabase client for Edge runtime
 * Reads cookies directly from the request headers
 */
export function createEdgeSupabase(req: NextRequest): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Create a Supabase admin client with service role key
 * Use this for operations that bypass RLS
 */
export function createEdgeAdminClient(): SupabaseClient {
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
 * Get authenticated user from request
 * Supports both Bearer token and cookie-based authentication
 */
export async function getAuthenticatedUser(
  req: NextRequest,
  supabase: SupabaseClient
): Promise<{ id: string; email?: string } | null> {
  // Method 1: Try Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        return {
          id: user.id,
          email: user.email,
        };
      }
    } catch {
      // Continue to try cookie-based auth
    }
  }
  
  // Method 2: Try cookie-based authentication
  const cookieHeader = req.headers.get('cookie');
  
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    
    // Try different cookie names that Supabase might use
    const accessToken = 
      cookies['sb-access-token'] || 
      cookies['access_token'] ||
      cookies['sb:token'] ||
      findSupabaseTokenCookie(cookies);
    
    if (accessToken) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        
        if (!error && user) {
          return {
            id: user.id,
            email: user.email,
          };
        }
      } catch {
        // Token invalid or expired
      }
    }
  }
  
  return null;
}

/**
 * Find Supabase token cookie with project-specific prefix
 * Supabase creates cookies like: sb-{project-ref}-auth-token
 */
function findSupabaseTokenCookie(cookies: Record<string, string>): string | null {
  for (const [name, value] of Object.entries(cookies)) {
    // Look for Supabase auth token cookies
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      try {
        // Supabase stores the token as JSON
        const parsed = JSON.parse(decodeURIComponent(value));
        if (parsed.access_token) {
          return parsed.access_token;
        }
      } catch {
        // Not JSON, might be plain token
        return value;
      }
    }
  }
  return null;
}

/**
 * Require authentication - returns user or throws error response
 */
export async function requireAuth(
  req: NextRequest,
  supabase: SupabaseClient
): Promise<{ id: string; email?: string }> {
  const user = await getAuthenticatedUser(req, supabase);
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  return user;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}
