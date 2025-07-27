# Finance Tracker Backend

A secure, production-ready backend for the Finance Tracker application with bank-level security features.

## 🔒 Security Features

- **Authentication**: JWT-based auth with Firebase Admin SDK
- **Rate Limiting**: Multiple layers of rate limiting and speed limiting
- **XSS Protection**: Comprehensive XSS prevention with input sanitization
- **Data Encryption**: AES-256-GCM encryption for sensitive financial data
- **Audit Logging**: Complete audit trail with Winston logger
- **Input Validation**: Strict input validation with express-validator
- **Security Headers**: Helmet.js with enhanced CSP
- **CORS Protection**: Configurable CORS with security best practices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Firebase project with Firestore enabled
- Firebase Admin SDK service account key

### Installation

1. **Clone and install dependencies:**
```bash
cd backend
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Required Environment Variables:**
```env
# Firebase
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Security
JWT_SECRET=your-super-secure-jwt-secret-key
ENCRYPTION_KEY=your-256-bit-encryption-key-in-hex

# Server
PORT=3000
FRONTEND_URL=http://localhost:8080
```

4. **Generate secure keys:**
```bash
# JWT Secret (64+ characters recommended)
openssl rand -base64 64

# Encryption Key (32 bytes for AES-256)
openssl rand -hex 32
```

### Development

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── firebase.ts           # Firebase admin configuration
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication
│   │   ├── security.ts          # Rate limiting, validation
│   │   ├── auditLogger.ts       # Security event logging
│   │   ├── encryption.ts        # Data encryption utilities
│   │   ├── xssProtection.ts     # XSS prevention
│   │   └── errorHandler.ts      # Global error handling
│   ├── services/
│   │   ├── authService.ts       # Authentication logic
│   │   └── baseService.ts       # CRUD operations with encryption
│   ├── routes/
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── bankAccounts.ts      # Bank account CRUD
│   │   ├── creditCards.ts       # Credit card CRUD
│   │   ├── transactions.ts      # Transaction CRUD
│   │   ├── budgets.ts           # Budget CRUD
│   │   ├── savingsGoals.ts      # Savings goals CRUD
│   │   ├── recurringPayments.ts # Recurring payments CRUD
│   │   ├── stocks.ts            # Stock portfolio CRUD
│   │   └── accountGoals.ts      # Account goals CRUD
│   └── index.ts                 # Main server file
├── logs/                        # Log files directory
├── .env.example                 # Environment template
├── package.json
└── README.md
```

## 🔐 Security Configuration

### Firebase Setup

1. **Create Firebase project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Firestore Database

2. **Generate service account:**
   - Project Settings → Service Accounts
   - Generate private key
   - Download JSON file
   - Set content as `FIREBASE_SERVICE_ACCOUNT` env var

### Rate Limiting

- **Authentication**: 5 attempts per 15 minutes
- **API Requests**: 100 requests per 15 minutes  
- **Speed Limiting**: Progressive delays after 10 requests

### Data Encryption

Sensitive fields are automatically encrypted:
- Account numbers
- Routing numbers
- SSN/EIN
- Credit card details

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Bank Accounts
- `GET /api/bank-accounts` - List accounts
- `POST /api/bank-accounts` - Create account
- `GET /api/bank-accounts/:id` - Get account
- `PUT /api/bank-accounts/:id` - Update account
- `DELETE /api/bank-accounts/:id` - Delete account

### Credit Cards
- `GET /api/credit-cards` - List cards
- `POST /api/credit-cards` - Create card
- `GET /api/credit-cards/:id` - Get card
- `PUT /api/credit-cards/:id` - Update card
- `DELETE /api/credit-cards/:id` - Delete card

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Budgets
- `GET /api/budgets` - List budgets
- `POST /api/budgets` - Create budget
- `GET /api/budgets/:id` - Get budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Savings Goals
- `GET /api/savings-goals` - List goals
- `POST /api/savings-goals` - Create goal
- `GET /api/savings-goals/:id` - Get goal
- `PUT /api/savings-goals/:id` - Update goal
- `DELETE /api/savings-goals/:id` - Delete goal

### Recurring Payments
- `GET /api/recurring-payments` - List payments
- `POST /api/recurring-payments` - Create payment
- `GET /api/recurring-payments/:id` - Get payment
- `PUT /api/recurring-payments/:id` - Update payment
- `DELETE /api/recurring-payments/:id` - Delete payment

### Stocks
- `GET /api/stocks` - List stocks
- `POST /api/stocks` - Create stock
- `GET /api/stocks/:id` - Get stock
- `PUT /api/stocks/:id` - Update stock
- `DELETE /api/stocks/:id` - Delete stock

### Account Goals
- `GET /api/account-goals` - List goals
- `POST /api/account-goals` - Create goal
- `GET /api/account-goals/:id` - Get goal
- `PUT /api/account-goals/:id` - Update goal
- `DELETE /api/account-goals/:id` - Delete goal

## 🔧 Production Deployment

### Environment Setup

1. **Use production environment variables:**
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com
```

2. **Security considerations:**
   - Use strong, unique JWT secret (64+ chars)
   - Generate fresh encryption key
   - Enable HTTPS in production
   - Configure proper CORS origins
   - Set up log rotation
   - Monitor audit logs

### Deployment Options

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Cloud Platforms:**
- **Heroku**: Add buildpacks for Node.js
- **Google Cloud Run**: Use Docker deployment
- **AWS Lambda**: Use serverless framework
- **DigitalOcean App Platform**: Connect GitHub repo

### Monitoring

Check these endpoints for health monitoring:
- `GET /health` - Health check endpoint
- Monitor log files in `logs/` directory
- Set up alerts for authentication failures
- Monitor rate limit violations

## 🛡️ Security Best Practices

1. **Regular Updates**: Keep dependencies updated
2. **Log Monitoring**: Monitor audit logs for suspicious activity
3. **Key Rotation**: Rotate JWT secrets and encryption keys regularly
4. **Backup Strategy**: Implement regular Firestore backups
5. **Access Control**: Use least privilege principle
6. **Network Security**: Use HTTPS, configure firewalls
7. **Input Validation**: All inputs are validated and sanitized

## 📞 Support

For issues or questions:
1. Check logs in `logs/` directory
2. Verify environment variables
3. Check Firebase project configuration
4. Review security logs for authentication issues

## 📄 License

This project is licensed under the MIT License.