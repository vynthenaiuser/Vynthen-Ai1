/**
 * Text-to-Speech API Route
 * 
 * Converts text to speech audio.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses fetch for external API (no Node.js dependencies)
 * - No Buffer usage
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Use Google Translate TTS (free, no auth needed)
    const encodedText = encodeURIComponent(text.substring(0, 200)); // Limit text length
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;
    
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      // Fallback: Return empty audio
      return NextResponse.json(
        { error: 'TTS service unavailable' },
        { status: 503 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('TTS API error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
