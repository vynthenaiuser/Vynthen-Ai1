/**
 * Audio Transcription API Route
 * 
 * Transcribes audio to text using AI.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - Uses edge-compatible audio processing
 * - Converts audio to base64 without Node.js Buffer
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Convert audio to base64 (Edge-compatible)
    const arrayBuffer = await audioFile.arrayBuffer();
    
    // Use btoa with Uint8Array for edge compatibility
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = btoa(binaryString);

    const response = await zai.audio.asr.create({
      file_base64: base64Audio,
    });

    return NextResponse.json({
      success: true,
      text: response.text,
    });
  } catch (error: unknown) {
    console.error('Transcription API error:', error instanceof Error ? error.message : 'Unknown');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
