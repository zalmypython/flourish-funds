import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware for enhanced protection
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent referrer leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for file uploads
  if (req.path.includes('/documents')) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; object-src 'none'; script-src 'none';"
    );
  }
  
  // Permissions policy
  res.setHeader(
    'Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  next();
};

/**
 * Rate limiting for document operations
 */
export const documentRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many document operations, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Strict rate limiting for sensitive operations (delete)
 */
export const strictRateLimit = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many deletion attempts, please try again later.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
};