/**
 * Secure Error Message Utility
 * Prevents verbose error disclosure that could aid attackers
 */

// Generic error messages for different error categories
export const GENERIC_ERRORS = {
  AUTHENTICATION: 'Authentication failed. Please check your credentials and try again.',
  AUTHORIZATION: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  SERVER: 'An unexpected error occurred. Please try again later.',
  NETWORK: 'Unable to connect. Please check your internet connection.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  DEFAULT: 'Something went wrong. Please try again or contact support.',
} as const;

type ErrorCategory = keyof typeof GENERIC_ERRORS;

/**
 * Maps technical error messages to user-friendly generic messages
 * Logs detailed error internally for debugging
 */
export function getSecureErrorMessage(
  error: unknown,
  category?: ErrorCategory
): string {
  // Log detailed error for debugging (in development or to error tracking)
  if (process.env.NODE_ENV === 'development') {
    console.error('[Debug Error]:', error);
  }
  
  // If a category is specified, return that generic message
  if (category) {
    return GENERIC_ERRORS[category];
  }
  
  // Try to infer category from error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('unauthorized') || message.includes('invalid credentials') || message.includes('invalid login')) {
      return GENERIC_ERRORS.AUTHENTICATION;
    }
    
    if (message.includes('forbidden') || message.includes('permission') || message.includes('access denied')) {
      return GENERIC_ERRORS.AUTHORIZATION;
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return GENERIC_ERRORS.NOT_FOUND;
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return GENERIC_ERRORS.VALIDATION;
    }
    
    if (message.includes('rate limit') || message.includes('too many')) {
      return GENERIC_ERRORS.RATE_LIMIT;
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return GENERIC_ERRORS.NETWORK;
    }
    
    if (message.includes('session') || message.includes('expired') || message.includes('jwt')) {
      return GENERIC_ERRORS.SESSION_EXPIRED;
    }
  }
  
  return GENERIC_ERRORS.DEFAULT;
}

/**
 * Wraps an async function to handle errors securely
 * Returns a tuple of [result, error] where error is a safe message
 */
export async function secureAsync<T>(
  fn: () => Promise<T>,
  errorCategory?: ErrorCategory
): Promise<[T | null, string | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    return [null, getSecureErrorMessage(error, errorCategory)];
  }
}
