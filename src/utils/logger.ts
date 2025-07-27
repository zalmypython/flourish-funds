type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
  sessionId: string;
  url: string;
  userAgent: string;
}

class Logger {
  private sessionId: string;
  private userId?: string;
  private isDevelopment: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  private formatLogForConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    
    if (entry.data) {
      console[entry.level](prefix, entry.message, entry.data);
    } else {
      console[entry.level](prefix, entry.message);
    }
  }

  private sendLogToServer(entry: LogEntry): void {
    // In production, send to analytics/monitoring service
    if (!this.isDevelopment) {
      // Example: send to your analytics endpoint
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // }).catch(() => {}); // Silent fail for logging
    }
  }

  debug(message: string, data?: any): void {
    const entry = this.createLogEntry('debug', message, data);
    
    if (this.isDevelopment) {
      this.formatLogForConsole(entry);
    }
  }

  info(message: string, data?: any): void {
    const entry = this.createLogEntry('info', message, data);
    
    this.formatLogForConsole(entry);
    this.sendLogToServer(entry);
  }

  warn(message: string, data?: any): void {
    const entry = this.createLogEntry('warn', message, data);
    
    this.formatLogForConsole(entry);
    this.sendLogToServer(entry);
  }

  error(message: string, data?: any): void {
    const entry = this.createLogEntry('error', message, data);
    
    this.formatLogForConsole(entry);
    this.sendLogToServer(entry);
  }

  // User action tracking
  trackUserAction(action: string, data?: any): void {
    this.info(`User Action: ${action}`, {
      action,
      ...data
    });
  }

  // Performance monitoring
  trackPerformance(operation: string, duration: number, metadata?: any): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      ...metadata
    });
  }

  // API call tracking
  trackApiCall(method: string, url: string, status: number, duration: number): void {
    const level = status >= 400 ? 'error' : 'info';
    this[level](`API Call: ${method} ${url}`, {
      method,
      url,
      status,
      duration
    });
  }
}

export const logger = new Logger();

// Performance measurement helper
export function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>,
  metadata?: any
): Promise<T> {
  const startTime = performance.now();
  
  const result = Promise.resolve(fn());
  
  return result.then(
    (value) => {
      const duration = performance.now() - startTime;
      logger.trackPerformance(operation, duration, metadata);
      return value;
    },
    (error) => {
      const duration = performance.now() - startTime;
      logger.trackPerformance(operation, duration, { ...metadata, error: true });
      throw error;
    }
  );
}