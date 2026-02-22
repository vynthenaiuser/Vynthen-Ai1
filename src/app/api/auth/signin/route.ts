/**
 * Sign In API Route
 * 
 * User authentication endpoint.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible Supabase client
 * - No Node.js dependencies
 * 
 * Security measures implemented:
 * - Strict rate limiting (5 attempts per 15 minutes) to prevent brute force
 * - Input validation with Zod schema
 * - Generic error messages (no user enumeration)
 * - Secure session handling
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createEdgeAdminClient } from '@/lib/edge-auth';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  validateRequestBody, 
  signInSchema,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// Sign In Handler
// ============================================

async function signInHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Validate request body
    const result = await validateRequestBody(req, signInSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email or password format' },
        { status: 400 }
      );
    }
    
    const { email, password } = result.data;

    // Sign in with Supabase Auth
    const supabaseAdmin = createEdgeAdminClient();
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Log sanitized error for monitoring
      console.log('[Auth] Sign in failed:', sanitizeForLogging({
        error: error.message.substring(0, 100), // Truncate to prevent log injection
      }));
      
      // OWASP: Use generic error message to prevent account enumeration
      // Don't reveal if email exists or password is wrong
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user profile
    let profile = null;
    try {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('id', data.user.id)
        .single();
      profile = profileData;
    } catch {
      // Profile might not exist, continue without it
    }

    // Log successful sign in (sanitized)
    console.log('[Auth] Sign in successful:', sanitizeForLogging({
      userId: data.user.id,
      email: email.replace(/(.{2}).*@/, '$1***@'), // Partially mask email
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.user_metadata?.name,
        createdAt: data.user.created_at,
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        expires_at: data.session?.expires_at,
      },
    });
  } catch (error: unknown) {
    // Log internal error without exposing details
    console.error('[Auth] Internal error:', error instanceof Error ? error.message : 'Unknown');
    
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

// Apply strict rate limiting: 5 attempts per 15 minutes
// This prevents brute force password attacks
export const POST = withRateLimit(RATE_LIMITS.AUTH, 'signin')(signInHandler);
