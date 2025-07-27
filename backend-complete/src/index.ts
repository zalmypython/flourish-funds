import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { bankAccountRoutes } from './routes/bankAccounts';
import { creditCardRoutes } from './routes/creditCards';
import { transactionRoutes } from './routes/transactions';
import { budgetRoutes } from './routes/budgets';
import { savingsGoalRoutes } from './routes/savingsGoals';
import { recurringPaymentRoutes } from './routes/recurringPayments';
import { stockRoutes } from './routes/stocks';
import { accountGoalRoutes } from './routes/accountGoals';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase
initializeFirebase();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/credit-cards', creditCardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/savings-goals', savingsGoalRoutes);
app.use('/api/recurring-payments', recurringPaymentRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/account-goals', accountGoalRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});