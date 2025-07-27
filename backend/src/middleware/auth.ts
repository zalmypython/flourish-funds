import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/authService';
import { logSuspiciousActivity } from './auditLogger';

export interface AuthRequest extends Request {
  userId?: string;
  user?: { uid: string; email: string; };
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      logSuspiciousActivity(req, 'Missing authentication token');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Enhanced token verification with additional security checks
    const decoded = await authService.verifyToken(token);
    
    // Check token format and required fields
    if (!decoded.userId || !decoded.email) {
      logSuspiciousActivity(req, 'Invalid token format', { decoded });
      return res.status(403).json({ error: 'Invalid token format' });
    }

    req.userId = decoded.userId;
    req.user = { uid: decoded.userId, email: decoded.email };
    next();
  } catch (error: any) {
    logSuspiciousActivity(req, 'Token verification failed', { error: error.message });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    return res.status(403).json({ error: 'Authentication failed' });
  }
};