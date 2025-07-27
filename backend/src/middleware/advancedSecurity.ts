import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { enhancedLogger } from '../utils/enhancedLogger';

/**
 * Advanced security middleware collection
 */

// Enhanced rate limiting with different tiers
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  operation: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: `Too many ${options.operation} attempts`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      enhancedLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        operation: options.operation,
        url: req.url,
        userId: (req as any).userId
      });

      res.status(429).json({
        error: `Too many ${options.operation} attempts`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// Progressive delay for repeated requests
export const createSlowDown = (options: {
  windowMs: number;
  delayAfter: number;
  delayMs: number;
  operation: string;
}) => {
  return slowDown({
    windowMs: options.windowMs,
    delayAfter: options.delayAfter,
    delayMs: options.delayMs,
    onLimitReached: (req: Request) => {
      enhancedLogger.logSecurityEvent('SLOW_DOWN_ACTIVATED', {
        ip: req.ip,
        operation: options.operation,
        url: req.url,
        userId: (req as any).userId
      });
    }
  });
};

// IP monitoring and blocking
class IPMonitor {
  private suspiciousIPs = new Map<string, {
    violations: number;
    lastViolation: number;
    blocked: boolean;
  }>();

  private readonly MAX_VIOLATIONS = 5;
  private readonly BLOCK_DURATION = 60 * 60 * 1000; // 1 hour

  reportViolation(ip: string, violation: string): void {
    const record = this.suspiciousIPs.get(ip) || {
      violations: 0,
      lastViolation: 0,
      blocked: false
    };

    record.violations++;
    record.lastViolation = Date.now();

    if (record.violations >= this.MAX_VIOLATIONS) {
      record.blocked = true;
      enhancedLogger.logSecurityEvent('IP_BLOCKED', {
        ip,
        violations: record.violations,
        reason: 'EXCESSIVE_VIOLATIONS'
      });
    }

    this.suspiciousIPs.set(ip, record);

    enhancedLogger.logSecurityEvent('IP_VIOLATION_REPORTED', {
      ip,
      violation,
      totalViolations: record.violations
    });
  }

  isBlocked(ip: string): boolean {
    const record = this.suspiciousIPs.get(ip);
    if (!record || !record.blocked) return false;

    // Check if block has expired
    if (Date.now() - record.lastViolation > this.BLOCK_DURATION) {
      record.blocked = false;
      record.violations = 0;
      this.suspiciousIPs.set(ip, record);
      return false;
    }

    return true;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip;
      
      if (this.isBlocked(ip)) {
        enhancedLogger.logSecurityEvent('BLOCKED_IP_ACCESS_ATTEMPT', {
          ip,
          url: req.url,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          error: 'Access denied',
          code: 'IP_BLOCKED'
        });
      }

      next();
    };
  }
}

export const ipMonitor = new IPMonitor();

// File upload security
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Check for file upload security headers
  if (req.files || req.file) {
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; script-src 'none';"
    };

    Object.entries(securityHeaders).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Log file upload attempt
    enhancedLogger.logAuditEvent('FILE_UPLOAD_SECURITY_CHECK', {
      userId: (req as any).userId,
      ip: req.ip,
      url: req.url,
      hasFiles: !!(req.files || req.file)
    });
  }

  next();
};

// Request validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Check for suspicious patterns in request
  const suspiciousPatterns = [
    { pattern: /\.\./g, name: 'DIRECTORY_TRAVERSAL' },
    { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, name: 'XSS_SCRIPT' },
    { pattern: /union[\s\S]*?select/gi, name: 'SQL_INJECTION' },
    { pattern: /exec\s*\(/gi, name: 'COMMAND_INJECTION' },
    { pattern: /javascript:/gi, name: 'JAVASCRIPT_PROTOCOL' }
  ];

  const requestContent = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    headers: req.headers
  });

  const detectedThreats = suspiciousPatterns.filter(({ pattern }) => 
    pattern.test(requestContent)
  );

  if (detectedThreats.length > 0) {
    enhancedLogger.logSuspiciousActivity('MALICIOUS_REQUEST_DETECTED', {
      ip: req.ip,
      userId: (req as any).userId,
      threats: detectedThreats.map(t => t.name),
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    ipMonitor.reportViolation(req.ip, detectedThreats.map(t => t.name).join(', '));

    return res.status(400).json({
      error: 'Invalid request detected',
      code: 'MALICIOUS_REQUEST'
    });
  }

  // Log request completion time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    enhancedLogger.logRequest(req, res, duration);
  });

  next();
};

// Authentication security
export const authSecurity = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    // Log authentication attempt
    enhancedLogger.logAuditEvent('AUTHENTICATION_ATTEMPT', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      hasToken: authHeader.startsWith('Bearer ')
    });
  }

  next();
};