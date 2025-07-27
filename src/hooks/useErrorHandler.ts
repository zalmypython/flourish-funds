import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ErrorHandler, AppError, ErrorContext } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

interface ErrorState {
  error: AppError | null;
  isLoading: boolean;
  hasError: boolean;
}

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  onError?: (error: AppError) => void;
  retryOptions?: {
    maxRetries?: number;
    backoffMs?: number;
  };
}

export function useErrorHandler(
  componentName: string,
  options: UseErrorHandlerOptions = {}
) {
  const {
    showToast = true,
    logError = true,
    onError,
    retryOptions = {}
  } = options;

  const { toast } = useToast();
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    hasError: false
  });

  const handleError = useCallback((error: unknown, context: ErrorContext = {}) => {
    const appError = ErrorHandler.handle(error, {
      componentName,
      ...context
    });

    setErrorState({
      error: appError,
      isLoading: false,
      hasError: true
    });

    if (logError) {
      logger.error('Component error handled', {
        component: componentName,
        error: appError.message,
        code: appError.code,
        context: appError.context
      });
    }

    if (showToast) {
      toast({
        title: 'Error',
        description: appError.message,
        variant: 'destructive',
      });
    }

    onError?.(appError);

    return appError;
  }, [componentName, showToast, logError, onError, toast]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<T | null> => {
    setErrorState(prev => ({ ...prev, isLoading: true, hasError: false }));

    try {
      const result = await ErrorHandler.withRetry(
        operation,
        retryOptions.maxRetries,
        retryOptions.backoffMs,
        { componentName, ...context }
      );

      setErrorState({
        error: null,
        isLoading: false,
        hasError: false
      });

      return result;
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [componentName, retryOptions, handleError]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isLoading: false,
      hasError: false
    });
  }, []);

  const retry = useCallback(async (operation: () => Promise<any>) => {
    clearError();
    return executeWithErrorHandling(operation, { action: 'retry' });
  }, [clearError, executeWithErrorHandling]);

  return {
    ...errorState,
    handleError,
    executeWithErrorHandling,
    clearError,
    retry
  };
}