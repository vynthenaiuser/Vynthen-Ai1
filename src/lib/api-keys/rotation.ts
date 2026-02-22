/**
 * API Key Rotation - Backward Compatibility Module
 * 
 * This file re-exports from the secure security module.
 * All actual implementation is in @/lib/security/api-keys
 * 
 * @deprecated Use @/lib/security instead
 */

export {
  getCurrentApiKey,
  rotateKeyOnFailure,
  getKeyRotationStatus as getRotationStatus,
} from '@/lib/security/api-keys';
