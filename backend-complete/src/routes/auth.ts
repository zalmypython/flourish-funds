import express from 'express';
import { authService } from '../services/authService';
import { loginValidation, registerValidation, handleValidationErrors } from '../middleware/security';
import { auditAuthEvents } from '../middleware/auditLogger';

const router = express.Router();

// Register - with proper password verification and security
router.post('/register', 
  registerValidation,
  handleValidationErrors,
  auditAuthEvents('register'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      const result = await authService.registerUser(email, password, ip);
      
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'User already exists') {
        return res.status(409).json({ error: 'User already exists' });
      }
      next(error);
    }
  }
);

// Login - with proper password verification and security
router.post('/login', 
  loginValidation,
  handleValidationErrors,
  auditAuthEvents('login'),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      
      const result = await authService.loginUser(email, password, ip);
      
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      next(error);
    }
  }
);

export { router as authRoutes };