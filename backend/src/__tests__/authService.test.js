const { AuthService } = require('../services/authService');

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('validatePassword', () => {
    it('should return true for valid password', () => {
      const result = authService.validatePassword('ValidPass123!');
      expect(result.isValid).toBe(true);
    });

    it('should return false for weak password', () => {
      const result = authService.validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should return false for password without special characters', () => {
      const result = authService.validatePassword('ValidPass123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      const result = authService.validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should return false for invalid email', () => {
      const result = authService.validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
    });
  });
});