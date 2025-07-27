import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { auth, db } from '../config/firebase';
import { auditLog } from '../middleware/auditLogger';

interface AuthResult {
  user: {
    id: string;
    email: string;
  };
  token: string;
}

class AuthService {
  async registerUser(email: string, password: string, ip: string): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await db.collection('users').where('email', '==', email).get();
      if (!existingUser.empty) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create Firebase user
      const userRecord = await auth.createUser({
        email,
        password
      });

      // Store additional user data in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        hashedPassword,
        createdAt: new Date(),
        lastLogin: new Date(),
        ipAddresses: [ip],
        isActive: true
      });

      // Generate JWT
      const token = jwt.sign(
        { 
          userId: userRecord.uid, 
          email: userRecord.email,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      auditLog({
        event: 'user_registered',
        userId: userRecord.uid,
        ip,
        userAgent: 'server',
        timestamp: new Date(),
        details: { email }
      });

      return {
        user: {
          id: userRecord.uid,
          email: userRecord.email || email
        },
        token
      };
    } catch (error: any) {
      auditLog({
        event: 'registration_failed',
        ip,
        userAgent: 'server',
        timestamp: new Date(),
        details: { email, error: error.message }
      });
      throw error;
    }
  }

  async loginUser(email: string, password: string, ip: string): Promise<AuthResult> {
    try {
      // Get user from Firestore
      const userSnapshot = await db.collection('users').where('email', '==', email).get();
      
      if (userSnapshot.empty) {
        throw new Error('Invalid credentials');
      }

      const userData = userSnapshot.docs[0].data();
      const userId = userSnapshot.docs[0].id;

      // Verify password
      const isValidPassword = await this.comparePassword(password, userData.hashedPassword);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login and IP
      await db.collection('users').doc(userId).update({
        lastLogin: new Date(),
        ipAddresses: [...new Set([...(userData.ipAddresses || []), ip])]
      });

      // Generate JWT
      const token = jwt.sign(
        { 
          userId, 
          email,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      auditLog({
        event: 'user_login',
        userId,
        ip,
        userAgent: 'server',
        timestamp: new Date(),
        details: { email }
      });

      return {
        user: {
          id: userId,
          email
        },
        token
      };
    } catch (error: any) {
      auditLog({
        event: 'login_failed',
        ip,
        userAgent: 'server',
        timestamp: new Date(),
        details: { email, error: error.message }
      });
      throw error;
    }
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      throw error;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const authService = new AuthService();