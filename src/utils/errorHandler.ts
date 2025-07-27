import { logger } from './logger';

export interface ErrorContext {
  userId?: string;
  componentName?: string;
  action?: string;
  field?: string;
  endpoint?: string;
  attempt?: number;
  maxRetries?: number;
  filename?: string;
  lineno?: number;
  colno?: number;
  plaidErrorCode?: string;
  additionalData?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date();

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, field?: string, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...context });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, statusCode: number = 0, context?: ErrorContext) {
    super(message, 'NETWORK_ERROR', statusCode, context);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: ErrorContext) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: ErrorContext) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

export class PlaidError extends AppError {
  constructor(message: string, plaidErrorCode?: string, context?: ErrorContext) {
    super(message, 'PLAID_ERROR', 502, { plaidErrorCode, ...context });
    this.name = 'PlaidError';
  }
}

// Error handler utility
export class ErrorHandler {
  static handle(error: unknown, context: ErrorContext = {}): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError(error.message, 'UNKNOWN_ERROR', 500, context);
      appError.stack = error.stack;
    } else if (typeof error === 'string') {
      appError = new AppError(error, 'UNKNOWN_ERROR', 500, context);
    } else {
      appError = new AppError('An unknown error occurred', 'UNKNOWN_ERROR', 500, context);
    }

    // Log the error
    logger.error('Error handled', {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      context: appError.context,
      stack: appError.stack
    });

    return appError;
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000,
    context: ErrorContext = {}
  ): Promise<T> {
    let lastError: AppError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          logger.info('Retrying operation', { 
            attempt, 
            maxRetries, 
            context 
          });
          await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
        }

        return await operation();
      } catch (error) {
        lastError = this.handle(error, { 
          ...context, 
          attempt, 
          maxRetries 
        });

        // Don't retry certain error types
        if (lastError instanceof ValidationError || 
            lastError instanceof AuthenticationError ||
            lastError instanceof AuthorizationError) {
          throw lastError;
        }

        if (attempt === maxRetries) {
          logger.error('Max retries exceeded', {
            context,
            maxRetries,
            finalError: lastError.message
          });
          throw lastError;
        }
      }
    }

    throw lastError!;
  }

  static createErrorBoundaryFallback(error: Error, componentName: string) {
    return {
      hasError: true,
      error: this.handle(error, { componentName }),
      retry: () => window.location.reload(),
      reportError: () => {
        // In production, report to external service
        logger.error('Error boundary triggered', {
          componentName,
          error: error.message,
          stack: error.stack
        });
      }
    };
  }
}

// API error interceptor
export const handleApiError = (error: any, endpoint: string) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        throw new ValidationError(data.message || 'Invalid request', undefined, { endpoint });
      case 401:
        throw new AuthenticationError(data.message, { endpoint });
      case 403:
        throw new AuthorizationError(data.message, { endpoint });
      case 404:
        throw new AppError('Resource not found', 'NOT_FOUND', 404, { endpoint });
      case 429:
        throw new AppError('Too many requests', 'RATE_LIMITED', 429, { endpoint });
      case 500:
        throw new AppError('Internal server error', 'SERVER_ERROR', 500, { endpoint });
      default:
        throw new NetworkError(`Request failed with status ${status}`, status, { endpoint });
    }
  } else if (error.request) {
    // Request was made but no response received
    throw new NetworkError('Network error - no response received', 0, { endpoint });
  } else {
    // Something happened in setting up the request
    throw new AppError(error.message, 'REQUEST_SETUP_ERROR', 0, { endpoint });
  }
};

// Global error handler for unhandled errors
export const setupGlobalErrorHandling = () => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = ErrorHandler.handle(event.reason, {
      action: 'unhandled_promise_rejection'
    });
    
    console.error('Unhandled promise rejection:', error);
    
    // Prevent the default browser behavior
    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = ErrorHandler.handle(event.error, {
      action: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
    
    console.error('Uncaught error:', error);
  });
};