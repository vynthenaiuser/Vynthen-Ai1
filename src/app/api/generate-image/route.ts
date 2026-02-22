/**
 * Image Generation API Route
 * 
 * AI image generation endpoint using Pollinations AI.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses fetch for external API (no Node.js dependencies)
 * - Stateless rate limiting
 * 
 * Security measures implemented:
 * - Rate limiting (5 images per minute) - stricter due to resource intensity
 * - Input validation with Zod schema
 * - Prompt sanitization to prevent injection
 * - URL validation for generated image URL
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  validateRequestBody, 
  generateImageSchema,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// Image Generation Handler
// ============================================

async function generateImageHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Validate request body
    const result = await validateRequestBody(req, generateImageSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid prompt',
          details: result.details?.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const { prompt } = result.data;

    // Log request (sanitized)
    console.log('[Image API] Request:', sanitizeForLogging({
      promptLength: prompt.length,
    }));

    // Enhance prompt for better quality (sanitized)
    // Remove potentially dangerous characters from prompt
    const sanitizedPrompt = prompt
      .replace(/[<>'"]/g, '') // Remove potential HTML/script chars
      .slice(0, 2000); // Ensure length limit
    
    const enhancedPrompt = `${sanitizedPrompt}, high quality, detailed, professional`;
    
    // Use Pollinations AI - free image generation
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;
    
    // Validate the generated URL
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: 'Failed to generate image URL' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
    });
  } catch (error: unknown) {
    console.error('[Image API] Error:', error instanceof Error ? error.message : 'Unknown');
    
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

// Apply strict rate limiting: 5 images per minute (resource intensive)
export const POST = withRateLimit(RATE_LIMITS.IMAGE_GENERATION, 'image')(generateImageHandler);
