import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Configure Winston logger with multiple transports
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

interface AuditEvent {
  event: string;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
}

export const auditLog = (event: AuditEvent) => {
  auditLogger.info('Audit Event', event);
};

// Audit authentication events
export const auditAuthEvents = (eventType: 'login' | 'register' | 'logout') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;
      
      auditLog({
        event: eventType,
        userId: responseData.user?.id,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date(),
        details: {
          success: res.statusCode < 400,
          statusCode: res.statusCode,
          email: req.body.email
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Audit API access
export const auditApiAccess = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const pathParts = req.path.split('/');
    const resource = pathParts[2] || 'unknown';
    const resourceId = pathParts[3] || null;
    
    auditLog({
      event: 'api_access',
      userId: (req as any).userId,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      details: {
        method: req.method,
        path: req.path,
        resource,
        resourceId,
        statusCode: res.statusCode,
        duration,
        success: res.statusCode < 400
      }
    });
  });
  
  next();
};

// Log suspicious activity
export const logSuspiciousActivity = (req: Request, activity: string, details?: any) => {
  auditLogger.warn('Suspicious Activity', {
    activity,
    userId: (req as any).userId,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date(),
    path: req.path,
    method: req.method,
    headers: req.headers,
    details
  });
};