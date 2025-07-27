import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  if (err.code === 'auth/user-not-found') {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (err.code === 'auth/wrong-password') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
};