import { Request, Response, NextFunction } from 'express';
import xss from 'xss';
import { auditLog } from './auditLogger';

// Enhanced XSS protection with stricter filtering
const XSS_OPTIONS = {
  whiteList: {
    // Extremely restrictive - only allow basic text formatting
    p: ['class'],
    br: [],
    strong: [],
    em: [],
    u: [],
    span: ['class']
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  onIgnoreTag: (tag: string, html: string, options: any) => {
    // Log any ignored tags as potential XSS attempts
    auditLog({
      event: 'xss_tag_blocked',
      timestamp: new Date(),
      ip: 'server',
      userAgent: 'server',
      details: { tag, html: html.substring(0, 100) }
    });
    return '';
  },
  onIgnoreTagAttr: (tag: string, name: string, value: string, isWhiteAttr: boolean) => {
    // Log suspicious attributes
    if (!isWhiteAttr && (name.toLowerCase().includes('on') || value.toLowerCase().includes('javascript'))) {
      auditLog({
        event: 'xss_attribute_blocked',
        timestamp: new Date(),
        ip: 'server',
        userAgent: 'server',
        details: { tag, attribute: name, value: value.substring(0, 50) }
      });
    }
    return '';
  }
};

// Detect XSS patterns in input
const detectXSSPatterns = (input: string): { detected: boolean; patterns: string[]; riskLevel: 'low' | 'medium' | 'high' } => {
  const patterns = [
    { regex: /<script[^>]*>.*?<\/script>/gi, risk: 'high', name: 'script_tag' },
    { regex: /javascript:/gi, risk: 'high', name: 'javascript_protocol' },
    { regex: /on\w+\s*=/gi, risk: 'medium', name: 'event_handler' },
    { regex: /<iframe[^>]*>/gi, risk: 'high', name: 'iframe_tag' },
    { regex: /eval\s*\(/gi, risk: 'high', name: 'eval_function' },
    { regex: /document\.cookie/gi, risk: 'medium', name: 'cookie_access' },
    { regex: /window\.location/gi, risk: 'medium', name: 'location_redirect' },
    { regex: /<img[^>]+src[^>]*>/gi, risk: 'low', name: 'img_tag' },
    { regex: /data:text\/html/gi, risk: 'high', name: 'data_uri_html' }
  ];
  
  const detectedPatterns: string[] = [];
  let highestRisk: 'low' | 'medium' | 'high' = 'low';
  
  patterns.forEach(pattern => {
    if (pattern.regex.test(input)) {
      detectedPatterns.push(pattern.name);
      if (pattern.risk === 'high') highestRisk = 'high';
      else if (pattern.risk === 'medium' && highestRisk !== 'high') highestRisk = 'medium';
    }
  });
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    riskLevel: highestRisk
  };
};

// Recursively sanitize object properties
const sanitizeObject = (obj: any, depth: number = 0): any => {
  if (depth > 10) return obj; // Prevent infinite recursion
  
  if (typeof obj === 'string') {
    return xss(obj, XSS_OPTIONS);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], depth + 1);
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Main XSS protection middleware
export const xssProtection = (options?: { 
  detectOnly?: boolean; 
  logThreats?: boolean; 
  blockCritical?: boolean; 
}) => {
  const config = {
    detectOnly: false,
    logThreats: true,
    blockCritical: true,
    ...options
  };
  
  return (req: Request, res: Response, next: NextFunction) => {
    // Set security headers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Check request body for XSS
    if (req.body && typeof req.body === 'object') {
      const bodyString = JSON.stringify(req.body);
      const xssAnalysis = detectXSSPatterns(bodyString);
      
      if (xssAnalysis.detected) {
        if (config.logThreats) {
          auditLog({
            event: 'xss_attempt_detected',
            userId: (req as any).userId,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            timestamp: new Date(),
            details: {
              path: req.path,
              method: req.method,
              patterns: xssAnalysis.patterns,
              riskLevel: xssAnalysis.riskLevel,
              bodyPreview: bodyString.substring(0, 200)
            }
          });
        }
        
        if (config.blockCritical && xssAnalysis.riskLevel === 'high') {
          return res.status(400).json({ 
            error: 'Request blocked due to security policy violation',
            code: 'XSS_DETECTED'
          });
        }
      }
      
      // Sanitize the request body if not in detect-only mode
      if (!config.detectOnly) {
        req.body = sanitizeObject(req.body);
      }
    }
    
    next();
  };
};

// Enhanced Content Security Policy
export const enhancedCSP = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.firebase.com https://firestore.googleapis.com; " +
    "frame-src 'none'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "upgrade-insecure-requests;"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

// Output encoding for responses
export const outputEncoding = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Sanitize response data to prevent XSS in output
    const sanitizedData = sanitizeObject(data);
    return originalJson.call(this, sanitizedData);
  };
  
  next();
};

// File upload XSS protection
export const fileUploadXSSProtection = (req: Request, res: Response, next: NextFunction) => {
  if (req.files || req.file) {
    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    
    for (const file of files) {
      if (file && file.buffer) {
        const content = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 1024));
        const xssAnalysis = detectXSSPatterns(content);
        
        if (xssAnalysis.detected && xssAnalysis.riskLevel === 'high') {
          auditLog({
            event: 'malicious_file_upload_blocked',
            userId: (req as any).userId,
            ip: req.ip || req.connection.remoteAddress || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            timestamp: new Date(),
            details: {
              filename: file.originalname,
              patterns: xssAnalysis.patterns,
              riskLevel: xssAnalysis.riskLevel
            }
          });
          
          return res.status(400).json({ 
            error: 'File upload blocked due to security policy violation',
            code: 'MALICIOUS_FILE_DETECTED'
          });
        }
      }
    }
  }
  
  next();
};

// XSS audit logger for headers and query params
export const xssAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  // Check headers for XSS attempts
  const suspiciousHeaders = ['x-forwarded-for', 'referer', 'user-agent'];
  suspiciousHeaders.forEach(header => {
    const value = req.headers[header];
    if (value && typeof value === 'string') {
      const xssAnalysis = detectXSSPatterns(value);
      if (xssAnalysis.detected) {
        auditLog({
          event: 'xss_in_headers',
          userId: (req as any).userId,
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          timestamp: new Date(),
          details: {
            header,
            value: value.substring(0, 100),
            patterns: xssAnalysis.patterns,
            riskLevel: xssAnalysis.riskLevel
          }
        });
      }
    }
  });
  
  // Check query parameters
  if (req.query) {
    const queryString = JSON.stringify(req.query);
    const xssAnalysis = detectXSSPatterns(queryString);
    if (xssAnalysis.detected) {
      auditLog({
        event: 'xss_in_query_params',
        userId: (req as any).userId,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date(),
        details: {
          query: queryString.substring(0, 200),
          patterns: xssAnalysis.patterns,
          riskLevel: xssAnalysis.riskLevel
        }
      });
    }
  }
  
  next();
};