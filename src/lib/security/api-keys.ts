/**
 * Secure API Key Handler - Cloudflare Pages Compatible
 * 
 * Implements secure API key management following OWASP best practices:
 * - All keys loaded from environment variables (never hardcoded)
 * - Keys are never exposed to client-side code
 * - Stateless key rotation (edge-compatible)
 * 
 * Cloudflare Edge Runtime Compatible:
 * - No in-memory state persistence (workers are stateless)
 * - Keys loaded from environment on each request
 * - For distributed rate limiting, use Cloudflare KV
 * 
 * OWASP Reference: https://owasp.org/www-community/vulnerabilities/Improper_Data_Authentication
 */

// ============================================
// API Key Loading
// ============================================

/**
 * Load API keys from environment
 * Returns array of keys (empty if not configured)
 * 
 * In Cloudflare, environment variables are available via:
 * - process.env (when using nodejs_compat flag)
 * - ctx.env (in workers)
 */
function loadOpenRouterKeys(): string[] {
  const keys: string[] = [];
  
  // Support multiple keys via indexed env vars: OPENROUTER_API_KEY_1, etc.
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`OPENROUTER_API_KEY_${i}`];
    if (key && key.trim().length > 0 && !key.includes('placeholder')) {
      keys.push(key.trim());
    }
  }
  
  // Also support single key via OPENROUTER_API_KEY
  const singleKey = process.env.OPENROUTER_API_KEY;
  if (singleKey && singleKey.trim().length > 0 && !singleKey.includes('placeholder')) {
    if (!keys.includes(singleKey.trim())) {
      keys.unshift(singleKey.trim());
    }
  }
  
  return keys;
}

// ============================================
// Stateless Key Selection
// ============================================

/**
 * Get the current API key using round-robin selection
 * 
 * In edge environments, each request runs in isolation,
 * so we use time-based rotation instead of maintaining state.
 */
export function getCurrentApiKey(): { key: string; index: number } {
  const keys = loadOpenRouterKeys();
  
  if (keys.length === 0) {
    throw new Error('No OpenRouter API keys configured');
  }
  
  // Use time-based rotation for stateless edge environments
  // This distributes load across keys without maintaining state
  const now = Date.now();
  const minute = Math.floor(now / 60000); // Rotate every minute
  const index = minute % keys.length;
  
  return { key: keys[index], index };
}

/**
 * Rotate to next key on failure
 * Returns a different key from the pool
 */
export function rotateKeyOnFailure(): string {
  const keys = loadOpenRouterKeys();
  
  if (keys.length === 0) {
    throw new Error('No OpenRouter API keys configured');
  }
  
  // Use a different time-based offset to get a different key
  const now = Date.now();
  const second = Math.floor(now / 1000);
  const index = (second + 1) % keys.length;
  
  return keys[index];
}

/**
 * Get key rotation status (for monitoring)
 * Does NOT expose actual keys
 */
export function getKeyRotationStatus(): {
  totalKeys: number;
  currentIndex: number;
  failedCount: number;
  lastReset: string;
} {
  const keys = loadOpenRouterKeys();
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  
  return {
    totalKeys: keys.length,
    currentIndex: minute % keys.length,
    failedCount: 0, // Not tracked in stateless mode
    lastReset: new Date(minute * 60000).toISOString(),
  };
}

// ============================================
// API Key Validation
// ============================================

/**
 * Validate API key format (basic check)
 */
export function validateKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // OpenRouter keys start with 'sk-or-'
  if (key.startsWith('sk-or-')) {
    return key.length >= 20 && key.length <= 100;
  }
  
  // Generic API key format
  return /^[a-zA-Z0-9_-]{20,100}$/.test(key);
}

// ============================================
// Secure Headers for API Requests
// ============================================

/**
 * Get secure headers for OpenRouter API requests
 */
export function getOpenRouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://vynthen.ai',
    'X-Title': 'Vynthen AI',
  };
}

// ============================================
// Environment Validation
// ============================================

/**
 * Validate required environment variables at startup
 */
export function validateEnvironment(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const recommended = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
  ];
  
  for (const varName of required) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
  
  for (const varName of recommended) {
    if (!process.env[varName]) {
      console.warn(`[Config] WARNING: Missing recommended environment variable: ${varName}`);
    }
  }
  
  console.log('[Config] Environment validation complete');
}

/**
 * Initialize API keys (call at startup if needed)
 */
export function initializeApiKeys(): void {
  const keys = loadOpenRouterKeys();
  
  if (keys.length === 0) {
    console.warn('[API Keys] WARNING: No OpenRouter API keys configured!');
    console.warn('[API Keys] Set OPENROUTER_API_KEY or OPENROUTER_API_KEY_1..N in environment');
  } else {
    console.log(`[API Keys] Loaded ${keys.length} OpenRouter API key(s)`);
  }
}

// Initialize on module load (works in both Node.js and Edge)
if (typeof window === 'undefined') {
  initializeApiKeys();
}
