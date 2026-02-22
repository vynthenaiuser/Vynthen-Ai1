/**
 * Single Message API Route
 * 
 * Update individual messages.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible Supabase client
 * - No Node.js dependencies
 * 
 * Security measures implemented:
 * - Rate limiting
 * - User authentication required
 * - Conversation ownership verification
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
  updateMessageSchema,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// PATCH - Update Message
// ============================================

async function updateMessageHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
): Promise<NextResponse> {
  try {
    const { id: conversationId, messageId } = await params;
    
    // Validate UUID formats
    try {
      validateUUID(conversationId, 'Conversation ID');
      validateUUID(messageId, 'Message ID');
    } catch {
      return NextResponse.json(
        { error: 'Invalid ID format' },
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

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Validate request body
    const result = await validateRequestBody(req, updateMessageSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid message data' },
        { status: 400 }
      );
    }
    
    const { content } = result.data;

    // Update message
    const { data, error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .select('id, role, content, image_url, created_at')
      .single();

    if (error) {
      console.error('[Message API] Update error:', sanitizeForLogging({ error: error.message }));
      return NextResponse.json(
        { error: 'Message not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data,
    });
  } catch (error: unknown) {
    console.error('[Message API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

export const PATCH = withRateLimit(RATE_LIMITS.WRITE, 'message:update')(updateMessageHandler);
