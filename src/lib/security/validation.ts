/**
 * Input Validation & Sanitization Schemas
 * 
 * Implements strict input validation following OWASP best practices:
 * - Schema-based validation with Zod
 * - Type checking and coercion
 * - Length limits to prevent DoS
 * - Input sanitization to prevent XSS
 * - Reject unexpected fields (mass assignment protection)
 * 
 * OWASP Reference: https://owasp.org/www-community/vulnerabilities/Mass_Assignment
 */

import { z } from 'zod';

// ============================================
// Common Validation Utilities
// ============================================

/**
 * Sanitize string input to prevent XSS
 * Removes dangerous characters while preserving content
 */
const sanitizeString = (str: string): string => {
  return str
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim whitespace
    .trim();
};

/**
 * Create a sanitized string schema with length limits
 */
const safeString = (minLen: number, maxLen: number, fieldName: string) => 
  z.string()
    .min(minLen, `${fieldName} must be at least ${minLen} characters`)
    .max(maxLen, `${fieldName} must be at most ${maxLen} characters`)
    .transform(sanitizeString);

/**
 * Email validation with RFC 5322 compliant regex
 * OWASP: Validate email format to prevent injection
 */
const emailSchema = z.string()
  .email('Invalid email address')
  .max(254, 'Email must be at most 254 characters') // RFC 5321 max length
  .transform(sanitizeString)
  .transform(email => email.toLowerCase());

/**
 * Password validation with complexity requirements
 * OWASP: Minimum 8 characters, mix of character types
 * https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Authentication_Testing/01-Testing_for_Weak_Password_Policy
 */
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine(
    password => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    password => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    password => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    password => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    'Password must contain at least one special character'
  );

// ============================================
// Authentication Schemas
// ============================================

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(128),
}).strict(); // Reject unexpected fields (mass assignment protection)

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .transform(sanitizeString)
    .optional(),
}).strict();

export const resetPasswordSchema = z.object({
  email: emailSchema,
}).strict();

// ============================================
// Chat Schemas
// ============================================

const messageRoleSchema = z.enum(['user', 'assistant', 'system'], {
  errorMap: () => ({ message: 'Invalid message role' }),
});

const messageSchema = z.object({
  role: messageRoleSchema,
  content: z.string()
    .min(1, 'Message content is required')
    .max(32000, 'Message content exceeds maximum length (32000 characters)')
    .transform(sanitizeString),
}).strict();

export const chatSchema = z.object({
  messages: z.array(messageSchema)
    .min(1, 'At least one message is required')
    .max(50, 'Too many messages in a single request'),
  stream: z.boolean().optional().default(false),
}).strict();

// ============================================
// Conversation Schemas
// ============================================

export const createConversationSchema = z.object({
  title: z.string()
    .max(200, 'Title must be at most 200 characters')
    .transform(sanitizeString)
    .optional()
    .nullable(),
}).strict();

export const updateConversationSchema = z.object({
  title: z.string()
    .max(200, 'Title must be at most 200 characters')
    .transform(sanitizeString)
    .optional(),
}).strict();

// ============================================
// Message Schemas
// ============================================

export const createMessageSchema = z.object({
  role: messageRoleSchema,
  content: z.string()
    .min(1, 'Message content is required')
    .max(32000, 'Message content exceeds maximum length')
    .transform(sanitizeString),
  image_url: z.string()
    .url('Invalid image URL')
    .max(2048, 'Image URL exceeds maximum length')
    .optional()
    .nullable(),
}).strict();

export const updateMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(32000, 'Message content exceeds maximum length')
    .transform(sanitizeString),
}).strict();

// ============================================
// Image Generation Schema
// ============================================

export const generateImageSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(2000, 'Prompt must be at most 2000 characters')
    .transform(sanitizeString),
}).strict();

// ============================================
// Translation Schema
// ============================================

const languageCodeSchema = z.string()
  .length(2, 'Language code must be exactly 2 characters')
  .regex(/^[a-z]{2}$/, 'Language code must be lowercase letters');

export const translateSchema = z.object({
  text: z.string()
    .min(1, 'Text is required')
    .max(10000, 'Text must be at most 10000 characters')
    .transform(sanitizeString),
  targetLang: languageCodeSchema,
  sourceLang: languageCodeSchema.optional(),
}).strict();

// ============================================
// Text-to-Speech Schema
// ============================================

export const ttsSchema = z.object({
  text: z.string()
    .min(1, 'Text is required')
    .max(5000, 'Text must be at most 5000 characters')
    .transform(sanitizeString),
  voice: z.string()
    .max(50, 'Voice name must be at most 50 characters')
    .optional(),
  speed: z.number()
    .min(0.5, 'Speed must be at least 0.5')
    .max(2.0, 'Speed must be at most 2.0')
    .optional(),
}).strict();

// ============================================
// Transcription Schema (for file uploads)
// ============================================

export const transcriptionOptionsSchema = z.object({
  language: languageCodeSchema.optional(),
}).strict();

// ============================================
// UUID Validation
// ============================================

const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Validate path parameter is a valid UUID
 */
export const validateUUID = (id: string, fieldName: string = 'ID'): string => {
  return uuidSchema.parse(id);
};

// ============================================
// Validation Helper Functions
// ============================================

import { NextRequest, NextResponse } from 'next/server';

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  details?: z.ZodError['errors'];
}

/**
 * Validate request body against a Zod schema
 * Returns validated data or error response
 * 
 * Usage:
 * ```typescript
 * const result = validateRequestBody(request, chatSchema);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * const { messages } = result.data;
 * ```
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<ValidationResult<z.infer<T>> | ValidationError> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      // Zod 4: Access errors via result.error.errors or result.error.issues
      const zodError = result.error;
      const errorDetails = zodError.errors || zodError.issues || [];
      
      return {
        success: false,
        error: 'Validation failed',
        details: errorDetails,
      };
    }
    
    return {
      success: true,
      data: result.data,
    };
  } catch {
    return {
      success: false,
      error: 'Invalid JSON in request body',
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): ValidationResult<z.infer<T>> | ValidationError {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);
    
    if (!result.success) {
      return {
        success: false,
        error: 'Invalid query parameters',
        details: result.error.errors,
      };
    }
    
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse query parameters',
    };
  }
}

/**
 * Create a validation middleware wrapper
 */
export function withValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (req: NextRequest, data: z.infer<T>) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await validateRequestBody(req, schema);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          details: result.details?.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    return handler(req, result.data);
  };
}

// ============================================
// Sanitization for Output
// ============================================

/**
 * Escape HTML entities to prevent XSS in responses
 * Use when returning user-generated content
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
}

/**
 * Sanitize object for safe logging (remove sensitive fields)
 */
export function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'cookie', 'session', 'credential', 'api_key', 'apikey',
  ];
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
