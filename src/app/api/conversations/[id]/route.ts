/**
 * Single Conversation API Route
 * 
 * Get, update, and delete individual conversations.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible Supabase client
 * - No Node.js dependencies
 * 
 * Security measures implemented:
 * - Rate limiting per endpoint type
 * - User authentication required
 * - User ownership verification
 * - Input validation with Zod schema
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createEdgeSupabase, getAuthenticatedUser } from '@/lib/edge-auth';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  validateRequestBody,
  validateUUID,
  updateConversationSchema,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// GET - Single Conversation
// ============================================

async function getConversationHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // Validate UUID format
    try {
      validateUUID(id, 'Conversation ID');
    } catch {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }
    
    const supabase = createEdgeSupabase(req);
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
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Don't reveal if conversation exists or not
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data,
    });
  } catch (error: unknown) {
    console.error('[Conversation API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to load conversation' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete Conversation
// ============================================

async function deleteConversationHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // Validate UUID format
    try {
      validateUUID(id, 'Conversation ID');
    } catch {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }
    
    const supabase = createEdgeSupabase(req);
    const user = await getAuthenticatedUser(req, supabase);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete messages first (explicit, though cascade should handle it)
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', id);

    // Delete conversation (only if user owns it)
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Conversation API] Delete error:', sanitizeForLogging({ error: error.message }));
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    console.error('[Conversation API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - Update Conversation
// ============================================

async function updateConversationHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // Validate UUID format
    try {
      validateUUID(id, 'Conversation ID');
    } catch {
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }
    
    const supabase = createEdgeSupabase(req);
    const user = await getAuthenticatedUser(req, supabase);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate request body
    const result = await validateRequestBody(req, updateConversationSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    const { title } = result.data;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      updateData.title = title;
    }

    const { data, error } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, title, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Conversation not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data,
    });
  } catch (error: unknown) {
    console.error('[Conversation API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

export const GET = withRateLimit(RATE_LIMITS.READ, 'conversation:get')(getConversationHandler);
export const DELETE = withRateLimit(RATE_LIMITS.WRITE, 'conversation:delete')(deleteConversationHandler);
export const PATCH = withRateLimit(RATE_LIMITS.WRITE, 'conversation:update')(updateConversationHandler);
