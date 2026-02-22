/**
 * Chat API Route
 * 
 * AI chat completion endpoint with streaming support.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses fetch for OpenRouter API (no Node.js dependencies)
 * - Stateless rate limiting (or KV-based if configured)
 * 
 * Security measures implemented:
 * - Rate limiting (IP based)
 * - Input validation with Zod schema
 * - API key rotation on failure
 * - Secure error handling (no sensitive data leaked)
 * 
 * OWASP Compliance:
 * - Input validation: ✓ Schema-based validation
 * - Rate limiting: ✓ 30 requests/minute
 * - Error handling: ✓ Safe error messages
 * - API key security: ✓ Environment variables only
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  validateRequestBody, 
  chatSchema,
  getCurrentApiKey,
  rotateKeyOnFailure,
  sanitizeForLogging,
} from '@/lib/security';

// Model configuration from environment
const getModel = () => process.env.OPENROUTER_MODEL || 'z-ai/glm-4.5-air:free';

// ============================================
// Chat Handler
// ============================================

async function chatHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Validate request body
    const result = await validateRequestBody(req, chatSchema);
    
    if (!result.success) {
      // Validation failed - return error with details
      const errorResponse: { error: string; details?: Array<{ path: string; message: string }> } = {
        error: 'Invalid request',
      };
      
      if (result.details && result.details.length > 0) {
        errorResponse.details = result.details.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
      }
      
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    const { messages, stream = false } = result.data;

    // Log request (sanitized - no message content)
    console.log('[Chat API] Request:', sanitizeForLogging({
      messageCount: messages.length,
      stream,
      model: getModel(),
    }));

    if (stream) {
      return handleStreamingResponse(messages);
    } else {
      return handleNonStreamingResponse(messages);
    }
  } catch (error: unknown) {
    console.error('[Chat API] Error:', error);
    
    // Never expose internal error details to client
    const errorMessage = error instanceof Error 
      ? (error.message.includes('API key') ? 'Service temporarily unavailable' : 'Internal server error')
      : 'Internal server error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// ============================================
// Streaming Response Handler
// ============================================

async function handleStreamingResponse(messages: Array<{role: string; content: string}>): Promise<NextResponse> {
  // Get current API key with rotation support
  let apiKey: string;
  try {
    apiKey = getCurrentApiKey().key;
  } catch {
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }
  
  // Make request to OpenRouter
  let response = await makeOpenRouterRequest(messages, true, apiKey);
  
  // If failed, try rotating through keys
  let attempts = 1;
  const maxAttempts = 5; // Limit rotation attempts
  
  while (!response.ok && attempts < maxAttempts) {
    console.log(`[Chat API] Key failed (${response.status}), rotating... (attempt ${attempts})`);
    
    try {
      apiKey = rotateKeyOnFailure();
      response = await makeOpenRouterRequest(messages, true, apiKey);
    } catch {
      break;
    }
    attempts++;
  }
  
  // Check if all attempts failed
  if (!response.ok) {
    // Check for specific error types
    if (response.status === 401 || response.status === 403) {
      console.error('[Chat API] Authentication error with OpenRouter');
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    if (response.status === 429) {
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to connect to AI service. Please try again.' },
      { status: 502 }
    );
  }

  // Stream response back to client
  const reader = response.body?.getReader();
  if (!reader) {
    return NextResponse.json(
      { error: 'No response stream available' },
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  let controllerClosed = false;
  
  const readable = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (!controllerClosed) {
              controllerClosed = true;
              controller.close();
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                if (!controllerClosed) {
                  controllerClosed = true;
                  controller.close();
                }
                return;
              }
              
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                
                if (content && !controllerClosed) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {
                // Skip invalid JSON chunks
              }
            }
          }
        }
      } catch (error) {
        console.error('[Chat API] Stream error:', error);
        
        if (!controllerClosed) {
          controllerClosed = true;
          try {
            controller.error(error);
          } catch {
            // Controller might already be closed
          }
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}

// ============================================
// Non-Streaming Response Handler
// ============================================

async function handleNonStreamingResponse(messages: Array<{role: string; content: string}>): Promise<NextResponse> {
  // Get API key with rotation
  let apiKey: string;
  try {
    apiKey = getCurrentApiKey().key;
  } catch {
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }
  
  let response = await makeOpenRouterRequest(messages, false, apiKey);
  
  // Rotate through keys on failure
  let attempts = 1;
  while (!response.ok && attempts < 5) {
    console.log(`[Chat API] Key failed, rotating... (attempt ${attempts})`);
    
    try {
      apiKey = rotateKeyOnFailure();
      response = await makeOpenRouterRequest(messages, false, apiKey);
    } catch {
      break;
    }
    attempts++;
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Service temporarily unavailable. Please try again later.' },
      { status: 503 }
    );
  }

  try {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse response' },
      { status: 500 }
    );
  }
}

// ============================================
// OpenRouter API Request Helper
// ============================================

async function makeOpenRouterRequest(
  messages: Array<{role: string; content: string}>, 
  stream: boolean, 
  apiKey: string
): Promise<Response> {
  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://vynthen.ai',
        'X-Title': 'Vynthen AI',
      },
      body: JSON.stringify({
        model: getModel(),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream,
      }),
    });
    
    return response;
  } catch (error) {
    console.error('[Chat API] Network error:', error);
    
    // Return a mock failed response
    return new Response(null, {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

// Apply rate limiting: 30 chat requests per minute per IP
export const POST = withRateLimit(RATE_LIMITS.CHAT, 'chat')(chatHandler);
