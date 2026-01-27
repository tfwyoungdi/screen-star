/**
 * Client-side rate limiter to prevent abuse of public endpoints
 * Uses localStorage to persist rate limit state across page refreshes
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  storageKey: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  storageKey: 'rl_default',
};

// Pre-configured rate limiters for common use cases
export const RATE_LIMITS = {
  // Contact form: 3 submissions per 5 minutes
  CONTACT_FORM: {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000,
    storageKey: 'rl_contact',
  },
  // Job application: 5 per 10 minutes
  JOB_APPLICATION: {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
    storageKey: 'rl_job_app',
  },
  // Booking creation: 10 per 5 minutes
  BOOKING: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
    storageKey: 'rl_booking',
  },
  // Login attempts: 5 per 15 minutes
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    storageKey: 'rl_login',
  },
  // Customer login: 5 per 15 minutes (separate from staff)
  CUSTOMER_LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    storageKey: 'rl_cust_login',
  },
  // Signup attempts: 3 per 30 minutes
  SIGNUP: {
    maxRequests: 3,
    windowMs: 30 * 60 * 1000,
    storageKey: 'rl_signup',
  },
  // Customer signup: 3 per 30 minutes
  CUSTOMER_SIGNUP: {
    maxRequests: 3,
    windowMs: 30 * 60 * 1000,
    storageKey: 'rl_cust_signup',
  },
  // Password reset: 3 per 30 minutes
  PASSWORD_RESET: {
    maxRequests: 3,
    windowMs: 30 * 60 * 1000,
    storageKey: 'rl_pwd_reset',
  },
  // Customer password reset: 3 per 30 minutes
  CUSTOMER_PASSWORD_RESET: {
    maxRequests: 3,
    windowMs: 30 * 60 * 1000,
    storageKey: 'rl_cust_pwd_reset',
  },
  // Promo code validation: 10 per 5 minutes
  PROMO_CODE: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
    storageKey: 'rl_promo',
  },
} as const;

/**
 * Validate rate limit entry structure to prevent XSS/tampering attacks
 * Only accepts properly structured objects with valid numeric values
 */
function isValidEntry(entry: unknown): entry is RateLimitEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  
  // Strict type checking - must be finite positive numbers
  if (typeof e.count !== 'number' || !Number.isFinite(e.count) || e.count < 0) return false;
  if (typeof e.resetAt !== 'number' || !Number.isFinite(e.resetAt) || e.resetAt < 0) return false;
  
  // Ensure count is within reasonable bounds (prevent overflow attacks)
  if (e.count > 10000) return false;
  
  return true;
}

/**
 * Get the current rate limit entry from storage
 * Validates data to prevent localStorage XSS/tampering attacks
 */
function getEntry(storageKey: string): RateLimitEntry | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    
    // Limit size to prevent parsing large malicious payloads (DoS prevention)
    if (stored.length > 200) {
      localStorage.removeItem(storageKey);
      return null;
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate structure before use
    if (!isValidEntry(parsed)) {
      // Clear corrupted/tampered data
      localStorage.removeItem(storageKey);
      return null;
    }
    
    return parsed;
  } catch {
    // Clear corrupted data on parse error
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore removal errors
    }
    return null;
  }
}

/**
 * Save rate limit entry to storage
 */
function setEntry(storageKey: string, entry: RateLimitEntry): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if an action is rate limited and optionally increment the counter
 * @returns Object with isLimited status, remaining requests, and time until reset
 */
export function checkRateLimit(
  config: RateLimitConfig = DEFAULT_CONFIG,
  increment: boolean = true
): {
  isLimited: boolean;
  remaining: number;
  resetInMs: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  let entry = getEntry(config.storageKey);

  // Check if entry exists and is still valid
  if (entry && entry.resetAt > now) {
    // Within the rate limit window
    if (entry.count >= config.maxRequests) {
      return {
        isLimited: true,
        remaining: 0,
        resetInMs: entry.resetAt - now,
        resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    // Increment counter if requested
    if (increment) {
      entry.count += 1;
      setEntry(config.storageKey, entry);
    }

    return {
      isLimited: false,
      remaining: config.maxRequests - entry.count,
      resetInMs: entry.resetAt - now,
      resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Create new entry (window expired or doesn't exist)
  const newEntry: RateLimitEntry = {
    count: increment ? 1 : 0,
    resetAt: now + config.windowMs,
  };
  setEntry(config.storageKey, newEntry);

  return {
    isLimited: false,
    remaining: config.maxRequests - newEntry.count,
    resetInMs: config.windowMs,
    resetInSeconds: Math.ceil(config.windowMs / 1000),
  };
}

/**
 * Hook-friendly rate limit check without incrementing
 */
export function peekRateLimit(config: RateLimitConfig = DEFAULT_CONFIG) {
  return checkRateLimit(config, false);
}

/**
 * Reset rate limit for a specific action
 */
export function resetRateLimit(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Format the wait time for user display
 */
export function formatWaitTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
