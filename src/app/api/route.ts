/**
 * Main API Route
 * 
 * Health check and API info endpoint.
 * 
 * Cloudflare Pages / Edge Runtime Compatible:
 * - No Node.js dependencies
 */

// Edge runtime for Cloudflare Pages compatibility
export const runtime = 'edge';

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Vynthen AI API",
    version: "1.0.0",
    status: "healthy",
  });
}
