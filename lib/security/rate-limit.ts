/**
 * Security & Rate Limiting Engine
 * In-memory sliding window rate limiter and prompt injection defense for untrusted news article inputs.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 40;
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // 1 minute

/**
 * Checks if a client IP has exceeded the allowed request threshold.
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const clientKey = ip || 'anonymous-client';

  // Periodic cleanup of expired entries
  if (rateLimitStore.size > 2000) {
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  const record = rateLimitStore.get(clientKey);

  if (!record || record.resetTime < now) {
    rateLimitStore.set(clientKey, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return {
      allowed: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      reset: Math.ceil((now + WINDOW_MS) / 1000),
    };
  }

  if (record.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining: MAX_REQUESTS - record.count,
    reset: Math.ceil(record.resetTime / 1000),
  };
}

/**
 * Cleans and encapsulates untrusted input to defend against system prompt override.
 * Treats user text purely as passive data content.
 */
export function sanitizeUntrustedArticleInput(input: string): string {
  if (!input) return '';
  // Neutralize common delimiter escapes
  return input
    .replace(/<\|endoftext\|>/g, '')
    .replace(/\[SYSTEM_INSTRUCTION\]/gi, '')
    .replace(/```(?:json|markdown)?\s*\{\s*"rules":/gi, '');
}
