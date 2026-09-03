import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter: 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter: 5 requests per 15 minutes per IP.
 * Prevents brute-force attacks on authentication endpoints.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts
});

/**
 * Webhook rate limiter: 1000 requests per hour.
 * Higher limit for webhook endpoints which may receive bursts.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  message: { error: 'Webhook rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Write operation rate limiter: 20 requests per 15 minutes per IP.
 * Applied to POST/PUT/PATCH/DELETE operations that mutate data.
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many write operations, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
