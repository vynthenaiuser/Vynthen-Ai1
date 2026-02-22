/**
 * Auth Callback Route
 * 
 * Handles OAuth and email verification callbacks.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible Supabase client
 * - No Node.js dependencies
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createEdgeAdminClient } from '@/lib/edge-auth';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const token_hash = requestUrl.searchParams.get('token_hash');
    const type = requestUrl.searchParams.get('type');

    const supabaseAdmin = createEdgeAdminClient();

    if (code) {
      // Exchange code for session
      const { error } = await supabaseAdmin.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Callback error:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/?auth_error=${encodeURIComponent(error.message)}`
        );
      }
    } else if (token_hash && type) {
      // Verify email with token hash
      const { error } = await supabaseAdmin.auth.verifyOtp({
        token_hash,
        type: type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
      });
      
      if (error) {
        console.error('OTP verification error:', error);
        return NextResponse.redirect(
          `${requestUrl.origin}/?auth_error=${encodeURIComponent(error.message)}`
        );
      }
    }

    // Redirect to home on success
    return NextResponse.redirect(`${requestUrl.origin}/?verified=true`);
  } catch (error: unknown) {
    console.error('Callback API error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.redirect(
      `${new URL(request.url).origin}/?auth_error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}
