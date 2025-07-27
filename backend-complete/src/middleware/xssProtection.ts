import xss from 'xss';
import { Request, Response, NextFunction } from 'express';
import { logSuspiciousActivity } from './auditLogger';

// XSS protection configuration for backend
const XSS_OPTIONS = {
  whiteList: {
    // Very restrictive - only allow basic formatting
    b: [],
    i: [],
    em: [],
    strong: [],
    p: [],
    br: [],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  allowCommentTag: false,
  onIgnoreTag: (tag: string, html: string, options: any) => {
    // Log attempts to use forbidden tags
    console.warn(`XSS: Forbidden tag attempted: ${tag}`);
    return '';
  },
  onIgnoreTagAttr: (tag: string, name: string, value: string, isWhiteAttr: boolean) => {
    // Log attempts to use forbidden attributes
    console.warn(`XSS: Forbidden attribute attempted: ${name}="${value}" on tag ${tag}`);
    return '';
  },
  onTagAttr: (tag: string, name: string, value: string, isWhiteAttr: boolean) => {
    // Additional validation for allowed attributes
    if (name === 'href' && value) {
      // Check for dangerous protocols
      if (value.match(/^(javascript|vbscript|data|file):/i)) {
        console.warn(`XSS: Dangerous protocol in href: ${value}`);
        return '';
      }
    }
    return `${name}="${xss.escapeAttrValue(value)}"`;
  },
  css: false, // Disable CSS parsing entirely
};

// Detect XSS patterns in strings
const detectXSSPatterns = (input: string): {
  isXSS: boolean;
  patterns: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
} => {
  const patterns: string[] = [];
  const suspiciousPatterns = [
    { pattern: /<script[\s\S]*?<\/script>/gi, level: 'critical', name: 'Script tags' },
    { pattern: /javascript:/gi, level: 'critical', name: 'JavaScript protocol' },
    { pattern: /on\w+\s*=/gi, level: 'high', name: 'Event handlers' },
    { pattern: /<iframe/gi, level: 'high', name: 'Iframe tags' },
    { pattern: /<object/gi, level: 'high', name: 'Object tags' },
    { pattern: /<embed/gi, level: 'high', name: 'Embed tags' },
    { pattern: /vbscript:/gi, level: 'high', name: 'VBScript protocol' },
    { pattern: /data:/gi, level: 'medium', name: 'Data protocol' },
    { pattern: /expression\s*\(/gi, level: 'medium', name: 'CSS expressions' },
    { pattern: /@import/gi, level: 'medium', name: 'CSS imports' },
    { pattern: /url\s*\(/gi, level: 'low', name: 'CSS url()' },
  ];

  let maxRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  suspiciousPatterns.forEach(({ pattern, level, name }) => {
    if (pattern.test(input)) {
      patterns.push(name);
      if (level === 'critical' || (level === 'high' && maxRiskLevel !== 'critical')) {
        maxRiskLevel = level;
      } else if (level === 'medium' && maxRiskLevel === 'low') {
        maxRiskLevel = level;
      }
    }
  });

  return {
    isXSS: patterns.length > 0,
    patterns,
    riskLevel: maxRiskLevel
  };
};

// Sanitize object recursively
const sanitizeObject = (obj: any, depth: number = 0): any => {
  if (depth > 10) return {}; // Prevent deep recursion attacks

  if (typeof obj === 'string') {
    return xss(obj, XSS_OPTIONS);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names too
      const cleanKey = xss(key, { whiteList: {} });
      sanitized[cleanKey] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }

  return obj;
};

// Middleware to sanitize request body
export const xssProtection = (options: {
  detectOnly?: boolean;
  logThreats?: boolean;
  blockCritical?: boolean;
} = {}) => {
  const {
    detectOnly = false,
    logThreats = true,
    blockCritical = true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip if no body
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      const originalBody = JSON.stringify(req.body);
      let hasThreats = false;
      let criticalThreats = false;

      // Check for XSS patterns in the entire request body
      const xssCheck = detectXSSPatterns(originalBody);
      
      if (xssCheck.isXSS) {
        hasThreats = true;
        criticalThreats = xssCheck.riskLevel === 'critical';

        if (logThreats) {
          logSuspiciousActivity(req, `XSS attempt detected: ${xssCheck.patterns.join(', ')}`, {
            riskLevel: xssCheck.riskLevel,
            patterns: xssCheck.patterns,
            body: originalBody.substring(0, 500) // Log partial body for analysis
          });
        }

        // Block critical threats
        if (blockCritical && criticalThreats) {
          return res.status(400).json({
            error: 'Request blocked for security reasons',
            code: 'XSS_DETECTED'
          });
        }
      }

      // Sanitize the request body if not in detect-only mode
      if (!detectOnly) {
        req.body = sanitizeObject(req.body);
      }

      // Add security headers to response
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      next();
    } catch (error) {
      console.error('XSS protection middleware error:', error);
      
      // In case of error, block the request for security
      res.status(500).json({
        error: 'Security processing error',
        code: 'SECURITY_ERROR'
      });
    }
  };
};

// Enhanced CSP middleware
export const enhancedCSP = (req: Request, res: Response, next: NextFunction) => {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Be more restrictive in production
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

// Output encoding middleware to prevent XSS in responses
export const outputEncoding = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function(obj: any) {
    // Sanitize response data
    const sanitizedObj = sanitizeObject(obj);
    return originalJson.call(this, sanitizedObj);
  };

  next();
};

// File upload XSS protection
export const fileUploadXSSProtection = (req: Request, res: Response, next: NextFunction) => {
  if (req.files || req.file) {
    // Check file content for embedded scripts
    const files = req.files || [req.file];
    
    for (const file of Array.isArray(files) ? files : Object.values(files).flat()) {
      if (file && typeof file === 'object' && 'buffer' in file) {
        const content = file.buffer.toString('utf8', 0, 1024); // Check first 1KB
        const xssCheck = detectXSSPatterns(content);
        
        if (xssCheck.isXSS && xssCheck.riskLevel === 'critical') {
          logSuspiciousActivity(req, 'Malicious file upload detected', {
            filename: file.originalname,
            mimetype: file.mimetype,
            patterns: xssCheck.patterns
          });
          
          return res.status(400).json({
            error: 'File upload blocked for security reasons',
            code: 'MALICIOUS_FILE'
          });
        }
      }
    }
  }
  
  next();
};

// XSS audit logging middleware
export const xssAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log potential XSS in headers
  const suspiciousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
  suspiciousHeaders.forEach(header => {
    const value = req.get(header);
    if (value) {
      const xssCheck = detectXSSPatterns(value);
      if (xssCheck.isXSS) {
        logSuspiciousActivity(req, `XSS in ${header} header`, {
          header,
          value: value.substring(0, 200),
          patterns: xssCheck.patterns,
          riskLevel: xssCheck.riskLevel
        });
      }
    }
  });

  // Log XSS in query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      const xssCheck = detectXSSPatterns(value);
      if (xssCheck.isXSS) {
        logSuspiciousActivity(req, `XSS in query parameter: ${key}`, {
          parameter: key,
          value: value.substring(0, 200),
          patterns: xssCheck.patterns,
          riskLevel: xssCheck.riskLevel
        });
      }
    }
  }

  next();
};