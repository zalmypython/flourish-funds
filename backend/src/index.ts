import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase';
import { errorHandler } from './middleware/errorHandler';
import { 
  authLimiter, 
  apiLimiter, 
  speedLimiter, 
  securityHeaders, 
  requestSizeLimiter 
} from './middleware/security';
import { auditApiAccess } from './middleware/auditLogger';
import { 
  xssProtection, 
  enhancedCSP, 
  outputEncoding, 
  xssAuditLogger 
} from './middleware/xssProtection';
import { 
  createRateLimit, 
  IPMonitor, 
  fileUploadSecurity 
} from './middleware/advancedSecurity';
import { enhancedLogger } from './utils/enhancedLogger';
import { authRoutes } from './routes/auth';
import { bankAccountRoutes } from './routes/bankAccounts';
import { creditCardRoutes } from './routes/creditCards';
import { notificationRoutes } from './routes/notifications';
import { transactionRoutes } from './routes/transactions';
import { budgetRoutes } from './routes/budgets';
import { savingsGoalRoutes } from './routes/savingsGoals';
import { recurringPaymentRoutes } from './routes/recurringPayments';
import { stockRoutes } from './routes/stocks';
import { accountGoalRoutes } from './routes/accountGoals';
import { taxDocumentRoutes } from './routes/taxDocuments';
import plaidRoutes from './routes/plaidRoutes';
import insuranceRoutes from './routes/insurance';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase
initializeFirebase();

// Enhanced security middleware stack
app.use(enhancedCSP);
app.use(securityHeaders);
app.use(requestSizeLimiter);
app.use(speedLimiter);
app.use(xssAuditLogger);
app.use(IPMonitor.middleware);

// Initialize enhanced logging
enhancedLogger.logApplicationEvent('SERVER_STARTING', {
  port: PORT,
  nodeEnv: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Device-Fingerprint'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

// Body parsing with size limits and XSS protection
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(xssProtection({ detectOnly: false, logThreats: true, blockCritical: true }));
app.use(outputEncoding);

// Audit logging for all API requests
app.use('/api', auditApiAccess);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes with appropriate rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bank-accounts', apiLimiter, bankAccountRoutes);
app.use('/api/credit-cards', apiLimiter, creditCardRoutes);
app.use('/api/transactions', apiLimiter, transactionRoutes);
app.use('/api/budgets', apiLimiter, budgetRoutes);
app.use('/api/savings-goals', apiLimiter, savingsGoalRoutes);
app.use('/api/recurring-payments', apiLimiter, recurringPaymentRoutes);
app.use('/api/stocks', apiLimiter, stockRoutes);
app.use('/api/account-goals', apiLimiter, accountGoalRoutes);
app.use('/api/plaid', apiLimiter, plaidRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/tax-forms', apiLimiter, taxDocumentRoutes);
app.use('/api/insurance', apiLimiter, insuranceRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  enhancedLogger.logApplicationEvent('SERVER_STARTED', {
    port: PORT,
    timestamp: new Date().toISOString()
  });
});