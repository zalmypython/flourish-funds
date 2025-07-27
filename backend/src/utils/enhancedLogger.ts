import winston from 'winston';
import fs from 'fs';
import path from 'path';

/**
 * Enhanced backend logging with security focus
 */
class EnhancedBackendLogger {
  private logger: winston.Logger;
  private securityLogger: winston.Logger;
  private auditLogger: winston.Logger;

  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Main application logger
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            service: 'financial-app-backend',
            environment: process.env.NODE_ENV || 'development'
          });
        })
      ),
      transports: [
        new winston.transports.File({ 
          filename: path.join(logsDir, 'app.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 10485760,
          maxFiles: 5
        })
      ]
    });

    // Security-focused logger
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            type: 'SECURITY_EVENT',
            service: 'financial-app-security'
          });
        })
      ),
      transports: [
        new winston.transports.File({ 
          filename: path.join(logsDir, 'security.log'),
          maxsize: 20971520, // 20MB
          maxFiles: 10
        })
      ]
    });

    // Audit logger for compliance
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
            type: 'AUDIT_EVENT',
            service: 'financial-app-audit',
            immutable: true
          });
        })
      ),
      transports: [
        new winston.transports.File({ 
          filename: path.join(logsDir, 'audit.log'),
          maxsize: 52428800, // 50MB
          maxFiles: 20
        })
      ]
    });

    // Add console logging for development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  // Application logging
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Security logging
  logSecurityEvent(event: string, details: any): void {
    this.securityLogger.warn(event, {
      ...details,
      severity: this.calculateSecuritySeverity(event),
      requiresImmedateAttention: this.requiresImmediateAttention(event)
    });
  }

  logSuspiciousActivity(activity: string, details: any): void {
    this.securityLogger.error(`SUSPICIOUS_ACTIVITY: ${activity}`, {
      ...details,
      severity: 'HIGH',
      alertType: 'THREAT_DETECTION'
    });
  }

  // Audit logging for compliance
  logAuditEvent(event: string, details: any): void {
    this.auditLogger.info(event, {
      ...details,
      auditVersion: '1.0',
      complianceLevel: 'FINANCIAL_REGULATION'
    });
  }

  logDataAccess(details: any): void {
    this.auditLogger.info('DATA_ACCESS', {
      ...details,
      category: 'DATA_ACCESS',
      retention: 'LONG_TERM'
    });
  }

  logFinancialOperation(operation: string, details: any): void {
    this.auditLogger.info(`FINANCIAL_OPERATION: ${operation}`, {
      ...details,
      category: 'FINANCIAL_TRANSACTION',
      complianceRequired: true,
      retention: 'PERMANENT'
    });
  }

  private calculateSecuritySeverity(event: string): string {
    const highSeverityEvents = [
      'AUTHENTICATION_FAILURE',
      'UNAUTHORIZED_ACCESS',
      'DATA_BREACH',
      'MALICIOUS_FILE_UPLOAD',
      'SQL_INJECTION_ATTEMPT'
    ];

    const mediumSeverityEvents = [
      'RATE_LIMIT_EXCEEDED',
      'INVALID_FILE_TYPE',
      'SUSPICIOUS_PATTERN',
      'FAILED_VALIDATION'
    ];

    if (highSeverityEvents.some(e => event.includes(e))) {
      return 'HIGH';
    } else if (mediumSeverityEvents.some(e => event.includes(e))) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private requiresImmediateAttention(event: string): boolean {
    const criticalEvents = [
      'DATA_BREACH',
      'UNAUTHORIZED_ACCESS',
      'MALICIOUS_FILE_UPLOAD',
      'AUTHENTICATION_BYPASS'
    ];

    return criticalEvents.some(e => event.includes(e));
  }

  // Performance logging
  logPerformance(operation: string, duration: number, details?: any): void {
    this.logger.info(`PERFORMANCE: ${operation}`, {
      duration,
      ...details,
      category: 'PERFORMANCE'
    });

    // Alert on slow operations
    if (duration > 5000) { // 5 seconds
      this.securityLogger.warn('SLOW_OPERATION_DETECTED', {
        operation,
        duration,
        ...details,
        possibleIssue: 'PERFORMANCE_DEGRADATION'
      });
    }
  }

  // Request logging with security context
  logRequest(req: any, res: any, duration: number): void {
    const logData = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.userId,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    };

    this.auditLogger.info('API_REQUEST', logData);

    // Log suspicious requests
    if (this.isSuspiciousRequest(req)) {
      this.logSuspiciousActivity('SUSPICIOUS_REQUEST', logData);
    }
  }

  private isSuspiciousRequest(req: any): boolean {
    const suspiciousPatterns = [
      /\.\./,                    // Directory traversal
      /<script/i,                // XSS attempts
      /union.*select/i,          // SQL injection
      /exec\s*\(/i,             // Command injection
      /javascript:/i             // JavaScript protocol
    ];

    const checkString = `${req.url} ${req.get('User-Agent')} ${JSON.stringify(req.body)}`;
    
    return suspiciousPatterns.some(pattern => pattern.test(checkString));
  }
}

export const enhancedLogger = new EnhancedBackendLogger();