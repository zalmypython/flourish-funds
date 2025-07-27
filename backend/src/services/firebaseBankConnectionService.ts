import { db } from '../config/firebase';
import { BankConnectionModel, PlaidAccountData } from '../models/bankConnection';
import { encryptFinancialData, decryptFinancialData, encryptData } from '../middleware/encryption';
import { auditLog } from '../middleware/auditLogger';
import PlaidService from './plaidService';
import FirebaseTransactionService from './firebaseTransactionService';

interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: string;
}

export default class FirebaseBankConnectionService {
  private plaidService: PlaidService;
  private transactionService: FirebaseTransactionService;

  constructor(plaidConfig: PlaidConfig) {
    this.plaidService = new PlaidService(plaidConfig);
    this.transactionService = new FirebaseTransactionService();
  }

  async addConnection(userId: string, publicToken: string): Promise<BankConnectionModel> {
    try {
      // Exchange public token for access token
      const { accessToken, itemId } = await this.plaidService.exchangePublicToken(publicToken);
      
      // Get account information
      const accounts = await this.plaidService.getAccounts(accessToken);
      
      // Get institution information
      const institution = await this.plaidService.getInstitution(accounts[0]?.institutionId || '');

      // Encrypt the access token
      const encryptedAccessToken = encryptData(accessToken);

      const connection: Omit<BankConnectionModel, 'id'> = {
        userId,
        itemId,
        accessToken: encryptedAccessToken,
        institutionId: accounts[0]?.institutionId || '',
        institutionName: institution.name,
        accounts: accounts.map(acc => ({
          accountId: acc.accountId,
          name: acc.name,
          type: acc.type,
          subtype: acc.subtype || '',
          mask: acc.mask || '',
          balance: {
            available: acc.balance.available,
            current: acc.balance.current,
            limit: acc.balance.limit,
            isoCurrencyCode: acc.balance.isoCurrencyCode
          },
          institutionName: institution.name,
          lastUpdated: new Date()
        })),
        createdAt: new Date(),
        lastSync: new Date(),
        isActive: true,
        syncEnabled: true,
        syncFrequency: 'daily'
      };

      const encryptedData = encryptFinancialData(connection);
      const docRef = await db.collection('bank_connections').add(encryptedData);

      auditLog({
        event: 'bank_connection_added',
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { connectionId: docRef.id, institutionName: institution.name }
      });

      return { id: docRef.id, ...connection };
    } catch (error: any) {
      auditLog({
        event: 'bank_connection_add_failed',
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { error: error.message }
      });
      throw error;
    }
  }

  async getUserConnections(userId: string): Promise<BankConnectionModel[]> {
    try {
      const snapshot = await db.collection('bank_connections')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => {
        const data = decryptFinancialData(doc.data());
        return { id: doc.id, ...data } as BankConnectionModel;
      });
    } catch (error: any) {
      auditLog({
        event: 'bank_connections_read_failed',
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { error: error.message }
      });
      throw error;
    }
  }

  async getConnection(connectionId: string, userId: string): Promise<BankConnectionModel | null> {
    try {
      const doc = await db.collection('bank_connections').doc(connectionId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = decryptFinancialData(doc.data()!);
      if (data.userId !== userId) {
        return null;
      }

      return { id: doc.id, ...data } as BankConnectionModel;
    } catch (error) {
      return null;
    }
  }

  async syncTransactions(
    connectionId: string,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ newTransactions: any[]; updatedAccounts: PlaidAccountData[]; errors: string[] }> {
    try {
      const connection = await this.getConnection(connectionId, userId);
      if (!connection) {
        throw new Error('Bank connection not found');
      }

      // Create sync log
      const syncLogId = await this.transactionService.createSyncLog(userId, connectionId, 'manual');

      try {
        // Update sync log to running
        await this.transactionService.updateSyncLog(syncLogId, { status: 'running' });

        // Decrypt access token
        const accessToken = decryptFinancialData({ accessToken: connection.accessToken }).accessToken;

        // Fetch transactions from Plaid
        const plaidTransactions = await this.plaidService.getTransactions(
          accessToken,
          startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
          endDate || new Date().toISOString().split('T')[0] // today
        );

        // Process transactions
        const result = await this.transactionService.processTransactions(
          userId,
          connectionId,
          plaidTransactions
        );

        // Update account balances
        const updatedAccounts = await this.plaidService.getAccounts(accessToken);
        await this.updateConnectionAccounts(connectionId, updatedAccounts);

        // Update sync log to completed
        await this.transactionService.updateSyncLog(syncLogId, {
          status: 'completed',
          transactionsAdded: result.added.length,
          transactionsUpdated: result.updated.length,
          errors: result.errors
        });

        // Update last sync time
        await db.collection('bank_connections').doc(connectionId).update({
          lastSync: new Date()
        });

        auditLog({
          event: 'transactions_synced',
          userId,
          ip: 'server',
          userAgent: 'server',
          timestamp: new Date(),
          details: {
            connectionId,
            transactionsAdded: result.added.length,
            transactionsUpdated: result.updated.length
          }
        });

        return {
          newTransactions: result.added,
          updatedAccounts,
          errors: result.errors
        };
      } catch (error: any) {
        // Update sync log to failed
        await this.transactionService.updateSyncLog(syncLogId, {
          status: 'failed',
          errors: [error.message]
        });
        throw error;
      }
    } catch (error: any) {
      auditLog({
        event: 'transaction_sync_failed',
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { connectionId, error: error.message }
      });
      throw error;
    }
  }

  async syncAllUserConnections(userId: string): Promise<{ [connectionId: string]: any }> {
    const connections = await this.getUserConnections(userId);
    const results: { [connectionId: string]: any } = {};

    for (const connection of connections) {
      try {
        results[connection.id] = await this.syncTransactions(connection.id, userId);
      } catch (error: any) {
        results[connection.id] = { error: error.message };
      }
    }

    return results;
  }

  async removeConnection(connectionId: string, userId: string): Promise<void> {
    try {
      const connection = await this.getConnection(connectionId, userId);
      if (!connection) {
        throw new Error('Bank connection not found');
      }

      // Decrypt access token and remove from Plaid
      const accessToken = decryptFinancialData({ accessToken: connection.accessToken }).accessToken;
      await this.plaidService.removeItem(accessToken);

      // Mark connection as inactive instead of deleting
      await db.collection('bank_connections').doc(connectionId).update({
        isActive: false,
        lastError: 'Connection removed by user'
      });

      auditLog({
        event: 'bank_connection_removed',
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { connectionId }
      });
    } catch (error: any) {
      auditLog({
        event: 'bank_connection_remove_failed',
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { connectionId, error: error.message }
      });
      throw error;
    }
  }

  private async updateConnectionAccounts(
    connectionId: string,
    updatedAccounts: any[]
  ): Promise<void> {
    const updateData = {
      accounts: updatedAccounts.map(acc => ({
        accountId: acc.accountId,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype || '',
        mask: acc.mask || '',
        balance: {
          available: acc.balance.available,
          current: acc.balance.current,
          limit: acc.balance.limit,
          isoCurrencyCode: acc.balance.isoCurrencyCode
        },
        institutionName: acc.institutionName,
        lastUpdated: new Date()
      }))
    };

    const encryptedData = encryptFinancialData(updateData);
    await db.collection('bank_connections').doc(connectionId).update(encryptedData);
  }
}