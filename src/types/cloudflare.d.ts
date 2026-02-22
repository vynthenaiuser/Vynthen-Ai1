/**
 * Cloudflare Types
 * 
 * Type definitions for Cloudflare-specific globals and bindings.
 */

declare global {
  // Cloudflare KV Namespace binding
  var RATE_LIMIT_KV: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
  } | undefined;
  
  // Cloudflare D1 Database binding
  var DB: {
    prepare(query: string): {
      bind(...values: unknown[]): {
        all<T = unknown>(): Promise<{ results: T[] }>;
        first<T = unknown>(): Promise<T | null>;
        run(): Promise<{ success: boolean }>;
      };
      all<T = unknown>(): Promise<{ results: T[] }>;
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<{ success: boolean }>;
    };
  } | undefined;
  
  // Cloudflare environment (available in workers)
  var ENV: Record<string, string> | undefined;
}

export {};
