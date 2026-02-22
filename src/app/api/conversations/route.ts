/**
 * Conversations API Route
 * 
 * List and create user conversations.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible Supabase client
 * - No Node.js dependencies
 * 
 * Security measures implemented:
 * - Rate limiting (60 reads, 30 writes per minute)
 * - Input validation with Zod schema
 * - User authentication required
 * - User data isolation via Supabase RLS
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createEdgeSupabase, getAuthenticatedUser } from '@/lib/edge-auth';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  validateRequestBody, 
  createConversationSchema,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// GET - List Conversations
// ============================================

async function listConversationsHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createEdgeSupabase(req);
    
    // Get the current user
    const user = await getAuthenticatedUser(req, supabase);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Conversations API] List error:', sanitizeForLogging({ error: error.message }));
      return NextResponse.json(
        { error: 'Failed to load conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversations: data || [],
    });
  } catch (error: unknown) {
    console.error('[Conversations API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to load conversations' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create Conversation
// ============================================

async function createConversationHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createEdgeSupabase(req);
    
    // Get the current user
    const user = await getAuthenticatedUser(req, supabase);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate request body
    const result = await validateRequestBody(req, createConversationSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    const { title } = result.data;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title: title || null,
        user_id: user.id,
      })
      .select('id, title, created_at, updated_at')
      .single();

    if (error) {
      console.error('[Conversations API] Create error:', sanitizeForLogging({ error: error.message }));
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data,
    });
  } catch (error: unknown) {
    console.error('[Conversations API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

// GET: List conversations - 60 per minute
export const GET = withRateLimit(RATE_LIMITS.READ, 'conversations:list')(listConversationsHandler);

// POST: Create conversation - 30 per minute
export const POST = withRateLimit(RATE_LIMITS.WRITE, 'conversations:create')(createConversationHandler);
