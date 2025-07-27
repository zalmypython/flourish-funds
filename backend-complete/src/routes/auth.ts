import express from 'express';
import { auth } from '../config/firebase';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    
    const userRecord = await auth.createUser({
      email,
      password
    });
    
    const token = jwt.sign(
      { userId: userRecord.uid, email: userRecord.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      user: { id: userRecord.uid, email: userRecord.email },
      token
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Create a custom token for the user
    const userRecord = await auth.getUserByEmail(email);
    
    const token = jwt.sign(
      { userId: userRecord.uid, email: userRecord.email },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    res.json({
      user: { id: userRecord.uid, email: userRecord.email },
      token
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };