import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  AppError, 
  ValidationError, 
  NetworkError, 
  ErrorHandler 
} from '@/utils/errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AppError', () => {
    it('creates error with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.context).toEqual({});
    });

    it('creates error with custom values', () => {
      const context = { userId: 'test-user' };
      const error = new AppError('Test error', 'CUSTOM_ERROR', 400, context);
      
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual(context);
    });
  });

  describe('ValidationError', () => {
    it('creates validation error correctly', () => {
      const error = new ValidationError('Invalid field', 'email');
      
      expect(error.message).toBe('Invalid field');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.context.field).toBe('email');
    });
  });

  describe('NetworkError', () => {
    it('creates network error correctly', () => {
      const error = new NetworkError('Connection failed', 503);
      
      expect(error.message).toBe('Connection failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.statusCode).toBe(503);
    });
  });

  describe('ErrorHandler.handle', () => {
    it('handles AppError instance', () => {
      const originalError = new ValidationError('Test validation error');
      const result = ErrorHandler.handle(originalError);
      
      expect(result).toBe(originalError);
    });

    it('handles regular Error instance', () => {
      const originalError = new Error('Regular error');
      const result = ErrorHandler.handle(originalError);
      
      expect(result.message).toBe('Regular error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('handles string error', () => {
      const result = ErrorHandler.handle('String error');
      
      expect(result.message).toBe('String error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('handles unknown error type', () => {
      const result = ErrorHandler.handle(null);
      
      expect(result.message).toBe('An unknown error occurred');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('ErrorHandler.withRetry', () => {
    it('succeeds on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await ErrorHandler.withRetry(operation, 3);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and eventually succeeds', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');
      
      const result = await ErrorHandler.withRetry(operation, 3, 10);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('does not retry ValidationError', async () => {
      const operation = vi.fn().mockRejectedValue(new ValidationError('Invalid'));
      
      await expect(ErrorHandler.withRetry(operation, 3)).rejects.toThrow('Invalid');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('gives up after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      await expect(ErrorHandler.withRetry(operation, 2)).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});