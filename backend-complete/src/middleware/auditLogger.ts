import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'financial-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/audit.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});

export interface AuditEvent {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  ip: string;
  userAgent: string;
  success: boolean;
  error?: string;
  additionalData?: any;
}

export const auditLog = (event: AuditEvent) => {
  logger.info('AUDIT_EVENT', {
    timestamp: new Date().toISOString(),
    ...event
  });
};

// Middleware to log authentication events
export const auditAuthEvents = (action: 'login' | 'register' | 'logout') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      
      auditLog({
        userId: (req as AuthRequest).userId,
        action,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        success: isSuccess,
        error: isSuccess ? undefined : 'Authentication failed',
        additionalData: {
          email: req.body?.email,
          statusCode: res.statusCode
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware to log API access events
export const auditApiAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
    
    auditLog({
      userId: req.userId,
      action: `${req.method} ${req.route?.path || req.path}`,
      resource: req.route?.path?.split('/')[1] || 'unknown',
      resourceId: req.params?.id,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      success: isSuccess,
      error: isSuccess ? undefined : `HTTP ${res.statusCode}`,
      additionalData: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length')
      }
    });
  });
  
  next();
};

// Log suspicious activities
export const logSuspiciousActivity = (req: Request, reason: string, additionalData?: any) => {
  auditLog({
    userId: (req as AuthRequest).userId,
    action: 'SUSPICIOUS_ACTIVITY',
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    success: false,
    error: reason,
    additionalData: {
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      ...additionalData
    }
  });
};

export { logger };