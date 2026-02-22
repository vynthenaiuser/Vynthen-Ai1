/**
 * Security Module Index
 * 
 * Exports all security utilities for use across the application.
 * Cloudflare Pages / Edge Runtime compatible.
 * 
 * Usage:
 * ```typescript
 * import { withRateLimit, RATE_LIMITS } from '@/lib/security';
 * import { chatSchema } from '@/lib/security';
 * ```
 */

// Rate limiting (Edge-compatible)
export {
  RATE_LIMITS,
  checkRateLimit,
  withRateLimit,
} from './rate-limit';

// Input validation (Edge-compatible - uses Zod)
export {
  // Schemas
  signInSchema,
  signUpSchema,
  resetPasswordSchema,
  chatSchema,
  createConversationSchema,
  updateConversationSchema,
  createMessageSchema,
  updateMessageSchema,
  generateImageSchema,
  translateSchema,
  ttsSchema,
  transcriptionOptionsSchema,
  validateUUID,
  // Validation functions
  validateRequestBody,
  validateQueryParams,
  withValidation,
  // Sanitization
  escapeHtml,
  sanitizeForLogging,
} from './validation';

// API key management (Edge-compatible)
export {
  getCurrentApiKey,
  rotateKeyOnFailure,
  getKeyRotationStatus,
  validateKeyFormat,
  getOpenRouterHeaders,
  validateEnvironment,
  initializeApiKeys,
} from './api-keys';
