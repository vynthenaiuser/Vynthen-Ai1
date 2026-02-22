/**
 * API Keys Status Route
 * 
 * Provides information about API key rotation status.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - No Node.js dependencies
 * - Stateless operation
 * 
 * SECURITY: This endpoint is for monitoring only and does NOT expose:
 * - Actual API keys
 * - Detailed failure reasons
 * - Any sensitive information
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { 
  withRateLimit, 
  RATE_LIMITS, 
  getKeyRotationStatus,
} from '@/lib/security';

// ============================================
// GET - Key Status (Public but rate-limited)
// ============================================

async function getKeyStatusHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const status = getKeyRotationStatus();
    
    // Only expose safe information - no actual keys or sensitive details
    return NextResponse.json({
      success: true,
      status: {
        totalKeys: status.totalKeys,
        activeKeys: status.totalKeys - status.failedCount,
        currentIndex: status.currentIndex + 1, // 1-indexed for display
        lastReset: status.lastReset,
      },
    });
  } catch (error: unknown) {
    console.error('[Keys API] Error:', error instanceof Error ? error.message : 'Unknown');
    
    return NextResponse.json(
      { error: 'Failed to get key status' },
      { status: 500 }
    );
  }
}

// ============================================
// Export with Rate Limiting
// ============================================

// Public endpoint with basic rate limiting
export const GET = withRateLimit(RATE_LIMITS.PUBLIC, 'keys:status')(getKeyStatusHandler);

// POST is disabled for security - key management should be admin-only
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
