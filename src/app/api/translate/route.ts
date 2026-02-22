/**
 * Translation API Route
 * 
 * AI-powered text translation endpoint.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses fetch for OpenRouter API (no Node.js dependencies)
 * - Stateless rate limiting
 * 
 * Security measures implemented:
 * - Rate limiting (20 requests per minute)
 * - Input validation with Zod schema
 * - Language code validation
 * - Text length limits to prevent DoS
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  validateRequestBody, 
  translateSchema,
  getCurrentApiKey,
  sanitizeForLogging,
} from '@/lib/security';

// ============================================
// Language Configuration
// ============================================

// Supported languages with their names
const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  fr: 'French',
  am: 'Amharic',
  zh: 'Mandarin Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  pt: 'Portuguese',
  ru: 'Russian',
  de: 'German',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  sw: 'Swahili',
  yo: 'Yoruba',
  zu: 'Zulu',
  ha: 'Hausa',
  ig: 'Igbo',
  om: 'Oromo',
};

// ============================================
// Translation Handler
// ============================================

async function translateHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Validate request body
    const result = await validateRequestBody(req, translateSchema);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Invalid translation request',
          details: result.details?.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const { text, targetLang, sourceLang = 'en' } = result.data;

    // If target is same as source, return original
    if (targetLang === sourceLang) {
      return NextResponse.json({
        success: true,
        translatedText: text,
      });
    }

    // Validate language code is supported
    if (!SUPPORTED_LANGUAGES[targetLang]) {
      return NextResponse.json(
        { error: `Unsupported language code: ${targetLang}` },
        { status: 400 }
      );
    }

    const targetLanguageName = SUPPORTED_LANGUAGES[targetLang];

    // Log request (sanitized)
    console.log('[Translate API] Request:', sanitizeForLogging({
      textLength: text.length,
      targetLang,
      sourceLang,
    }));

    // Get API key securely
    let apiKey: string;
    try {
      apiKey = getCurrentApiKey().key;
    } catch {
      return NextResponse.json(
        { error: 'Translation service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Make translation request
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://vynthen.ai',
        'X-Title': 'Vynthen AI',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'z-ai/glm-4.5-air:free',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLanguageName}. Only output the translated text, nothing else. Preserve formatting, code blocks, and structure exactly as they are.`
          },
          {
            role: 'user',
            content: text
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error('[Translate API] OpenRouter error:', response.status);
      return NextResponse.json(
        { error: 'Translation service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content || text;

    return NextResponse.json({
      success: true,
      translatedText,
    });
  } catch (error: unknown) {
    console.error('[Translate API] Error:', error instanceof Error ? error.message : 'Unknown');
    
    return NextResponse.json(
      { error: 'Translation failed. Please try again.' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

// Apply rate limiting: 20 requests per minute
export const POST = withRateLimit(RATE_LIMITS.AI, 'translate')(translateHandler);
