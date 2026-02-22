/**
 * Messages API Route
 * 
 * List and create messages for a conversation.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible Supabase client
 * - No Node.js dependencies
 * 
 * Security measures implemented:
 * - Rate limiting per endpoint type
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
  createMessageSchema,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// GET - List Messages
// ============================================

async function listMessagesHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: conversationId } = await params;
    
    // Validate UUID format
    try {
      validateUUID(conversationId, 'Conversation ID');
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

    // Get messages
    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, image_url, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Messages API] List error:', sanitizeForLogging({ error: error.message }));
      return NextResponse.json(
        { error: 'Failed to load messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: data || [],
    });
  } catch (error: unknown) {
    console.error('[Messages API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create Message
// ============================================

async function createMessageHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: conversationId } = await params;
    
    // Validate UUID format
    try {
      validateUUID(conversationId, 'Conversation ID');
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

    // Verify conversation belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, title')
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
    const result = await validateRequestBody(req, createMessageSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid message data',
          details: result.details?.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const { role, content, image_url } = result.data;

    // Create message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        image_url: image_url || null,
      })
      .select('id, role, content, image_url, created_at')
      .single();

    if (messageError) {
      console.error('[Messages API] Create error:', sanitizeForLogging({ error: messageError.message }));
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Update title if this is the first user message
    if (role === 'user' && !conversation.title) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);
    }

    return NextResponse.json({
      success: true,
      message: messageData,
    });
  } catch (error: unknown) {
    console.error('[Messages API] Error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

export const GET = withRateLimit(RATE_LIMITS.READ, 'messages:list')(listMessagesHandler);
export const POST = withRateLimit(RATE_LIMITS.WRITE, 'messages:create')(createMessageHandler);
