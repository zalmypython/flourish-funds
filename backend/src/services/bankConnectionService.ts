import { encrypt, decrypt, EncryptedData } from '../middleware/encryption';
import PlaidService, { BankConnection, PlaidAccount, PlaidTransaction } from './plaidService';

interface StoredBankConnection {
  id: string;
  userId: string;
  itemId: string;
  accessToken: EncryptedData;
  institutionId: string;
  institutionName: string;
  accounts: PlaidAccount[];
  createdAt: Date;
  lastSync: Date;
  isActive: boolean;
}

interface TransactionSyncResult {
  newTransactions: PlaidTransaction[];
  updatedAccounts: PlaidAccount[];
  errors: string[];
}

class BankConnectionService {
  private connections: Map<string, StoredBankConnection> = new Map();
  private plaidService: PlaidService;
  
  constructor(plaidService: PlaidService) {
    this.plaidService = plaidService;
  }
  
  // Add new bank connection
  async addConnection(
    userId: string,
    publicToken: string
  ): Promise<BankConnection> {
    try {
      // Exchange public token for access token
      const { accessToken, itemId } = await this.plaidService.exchangePublicToken(publicToken);
      
      // Get accounts
      const accounts = await this.plaidService.getAccounts(accessToken);
      
      // Get institution info (using first account's institution)
      let institutionName = 'Unknown Bank';
      let institutionId = '';
      
      if (accounts.length > 0) {
        // In a real implementation, you'd need to get institution ID from the item
        // For now, we'll use a placeholder
        institutionId = 'placeholder_institution_id';
        institutionName = 'Connected Bank';
      }
      
      // Create connection record
      const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const connection: StoredBankConnection = {
        id: connectionId,
        userId,
        itemId,
        accessToken: encrypt(accessToken),
        institutionId,
        institutionName,
        accounts,
        createdAt: new Date(),
        lastSync: new Date(),
        isActive: true,
      };
      
      // Store connection
      this.connections.set(connectionId, connection);
      
      return this.decryptConnection(connection);
    } catch (error) {
      console.error('Error adding bank connection:', error);
      throw new Error('Failed to add bank connection');
    }
  }
  
  // Get user's bank connections
  getUserConnections(userId: string): BankConnection[] {
    const userConnections: BankConnection[] = [];
    
    for (const connection of this.connections.values()) {
      if (connection.userId === userId && connection.isActive) {
        userConnections.push(this.decryptConnection(connection));
      }
    }
    
    return userConnections;
  }
  
  // Get specific connection
  getConnection(connectionId: string, userId: string): BankConnection | null {
    const connection = this.connections.get(connectionId);
    
    if (!connection || connection.userId !== userId || !connection.isActive) {
      return null;
    }
    
    return this.decryptConnection(connection);
  }
  
  // Sync transactions for a connection
  async syncTransactions(
    connectionId: string,
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionSyncResult> {
    const connection = this.connections.get(connectionId);
    
    if (!connection || connection.userId !== userId || !connection.isActive) {
      throw new Error('Connection not found or unauthorized');
    }
    
    try {
      const accessToken = decrypt(connection.accessToken);
      
      // Default to last 30 days if no dates provided
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];
      
      // Get transactions
      const transactions = await this.plaidService.getTransactions(
        accessToken,
        start,
        end,
        connection.accounts.map(acc => acc.accountId)
      );
      
      // Get updated account balances
      const updatedAccounts = await this.plaidService.getAccounts(accessToken);
      
      // Update connection with new account data and sync time
      connection.accounts = updatedAccounts;
      connection.lastSync = new Date();
      this.connections.set(connectionId, connection);
      
      return {
        newTransactions: transactions,
        updatedAccounts,
        errors: [],
      };
    } catch (error) {
      console.error('Error syncing transactions:', error);
      return {
        newTransactions: [],
        updatedAccounts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
  
  // Sync all connections for a user
  async syncAllUserConnections(userId: string): Promise<{
    [connectionId: string]: TransactionSyncResult;
  }> {
    const userConnections = this.getUserConnections(userId);
    const results: { [connectionId: string]: TransactionSyncResult } = {};
    
    for (const connection of userConnections) {
      try {
        results[connection.id] = await this.syncTransactions(connection.id, userId);
      } catch (error) {
        results[connection.id] = {
          newTransactions: [],
          updatedAccounts: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }
    }
    
    return results;
  }
  
  // Remove connection
  async removeConnection(connectionId: string, userId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    
    if (!connection || connection.userId !== userId) {
      throw new Error('Connection not found or unauthorized');
    }
    
    try {
      const accessToken = decrypt(connection.accessToken);
      await this.plaidService.removeItem(accessToken);
      
      // Mark as inactive instead of deleting
      connection.isActive = false;
      this.connections.set(connectionId, connection);
    } catch (error) {
      console.error('Error removing connection:', error);
      throw new Error('Failed to remove connection');
    }
  }
  
  // Helper to decrypt connection for API responses
  private decryptConnection(connection: StoredBankConnection): BankConnection {
    return {
      id: connection.id,
      userId: connection.userId,
      itemId: connection.itemId,
      accessToken: decrypt(connection.accessToken),
      institutionId: connection.institutionId,
      institutionName: connection.institutionName,
      accounts: connection.accounts,
      createdAt: connection.createdAt,
      lastSync: connection.lastSync,
      isActive: connection.isActive,
    };
  }
}

export default BankConnectionService;