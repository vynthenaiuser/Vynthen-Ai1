/**
 * Sign Up API Route
 * 
 * User registration endpoint.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible Supabase client
 * - No Node.js dependencies
 * 
 * Security measures implemented:
 * - Strict rate limiting (5 attempts per 15 minutes) to prevent abuse
 * - Strong password validation (8+ chars, mixed case, numbers, special chars)
 * - Input validation with Zod schema
 * - No email enumeration in error messages
 * - Secure profile creation
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createEdgeAdminClient } from '@/lib/edge-auth';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  validateRequestBody, 
  signUpSchema,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// Sign Up Handler
// ============================================

async function signUpHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Validate request body with strong password requirements
    const result = await validateRequestBody(req, signUpSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid registration data',
          details: result.details?.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const { email, password, name } = result.data;

    // Create user with Supabase Auth
    const supabaseAdmin = createEdgeAdminClient();
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`,
      },
    });

    if (error) {
      // Log sanitized error for monitoring
      console.log('[Auth] Sign up failed:', sanitizeForLogging({
        error: error.message.substring(0, 100),
      }));
      
      // Handle specific errors without revealing too much
      if (error.message.includes('already registered')) {
        // OWASP: Don't confirm if email exists, use generic message
        return NextResponse.json(
          { error: 'Unable to create account. Please try a different email.' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('password')) {
        return NextResponse.json(
          { error: 'Password does not meet security requirements' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Unable to create account. Please try again.' },
        { status: 400 }
      );
    }

    // Create profile in profiles table
    if (data.user) {
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: data.user.id,
          email: email,
          name: name || null,
          updated_at: new Date().toISOString(),
        });
      } catch (profileError) {
        // Log but don't fail - profile can be created later
        console.error('[Auth] Profile creation failed:', profileError);
      }
    }

    // Log successful registration (sanitized)
    console.log('[Auth] Sign up successful:', sanitizeForLogging({
      userId: data.user?.id,
      email: email.replace(/(.{2}).*@/, '$1***@'),
    }));

    return NextResponse.json({
      success: true,
      message: 'Please check your email to confirm your account',
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });
  } catch (error: unknown) {
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
// This prevents automated account creation
export const POST = withRateLimit(RATE_LIMITS.AUTH, 'signup')(signUpHandler);
