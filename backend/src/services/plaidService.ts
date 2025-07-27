import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: string;
}

export interface BankConnection {
  id: string;
  userId: string;
  itemId: string;
  accessToken: string;
  institutionId: string;
  institutionName: string;
  accounts: PlaidAccount[];
  createdAt: Date;
  lastSync: Date;
  isActive: boolean;
}

export interface PlaidAccount {
  accountId: string;
  name: string;
  type: string;
  subtype: string;
  mask: string;
  balance: {
    available: number | null;
    current: number | null;
    limit: number | null;
  };
}

export interface PlaidTransaction {
  transactionId: string;
  accountId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  category: string[];
  subcategory?: string;
  pending: boolean;
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
}

class PlaidService {
  private client: PlaidApi;
  
  constructor(config: PlaidConfig) {
    const configuration = new Configuration({
      basePath: this.getEnvironment(config.environment),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': config.clientId,
          'PLAID-SECRET': config.secret,
        },
      },
    });
    
    this.client = new PlaidApi(configuration);
  }
  
  private getEnvironment(env: string) {
    switch (env.toLowerCase()) {
      case 'sandbox':
        return PlaidEnvironments.sandbox;
      case 'development':
        return PlaidEnvironments.development;
      case 'production':
        return PlaidEnvironments.production;
      default:
        return PlaidEnvironments.sandbox;
    }
  }
  
  // Create link token for Plaid Link initialization
  async createLinkToken(userId: string): Promise<string> {
    try {
      const response = await this.client.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'Finance Tracker',
        products: ['transactions'],
        country_codes: ['US'],
        language: 'en',
      });
      
      return response.data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw new Error('Failed to create link token');
    }
  }
  
  // Exchange public token for access token
  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    try {
      const response = await this.client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      
      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw new Error('Failed to exchange public token');
    }
  }
  
  // Get accounts for a user
  async getAccounts(accessToken: string): Promise<PlaidAccount[]> {
    try {
      const response = await this.client.accountsGet({
        access_token: accessToken,
      });
      
      return response.data.accounts.map(account => ({
        accountId: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype || '',
        mask: account.mask || '',
        balance: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
        },
      }));
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw new Error('Failed to fetch accounts');
    }
  }
  
  // Get transactions for an account
  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    accountIds?: string[]
  ): Promise<PlaidTransaction[]> {
    try {
      const response = await this.client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        account_ids: accountIds,
      });
      
      return response.data.transactions.map(transaction => ({
        transactionId: transaction.transaction_id,
        accountId: transaction.account_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchantName: transaction.merchant_name || undefined,
        category: transaction.category || [],
        subcategory: transaction.category?.[1],
        pending: transaction.pending,
        location: transaction.location ? {
          address: transaction.location.address || undefined,
          city: transaction.location.city || undefined,
          region: transaction.location.region || undefined,
          postalCode: transaction.location.postal_code || undefined,
          country: transaction.location.country || undefined,
        } : undefined,
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }
  
  // Get institution info
  async getInstitution(institutionId: string): Promise<{ name: string; website?: string }> {
    try {
      const response = await this.client.institutionsGetById({
        institution_id: institutionId,
        country_codes: ['US'],
      });
      
      return {
        name: response.data.institution.name,
        website: response.data.institution.url || undefined,
      };
    } catch (error) {
      console.error('Error fetching institution:', error);
      throw new Error('Failed to fetch institution');
    }
  }
  
  // Remove item (disconnect bank account)
  async removeItem(accessToken: string): Promise<void> {
    try {
      await this.client.itemRemove({
        access_token: accessToken,
      });
    } catch (error) {
      console.error('Error removing item:', error);
      throw new Error('Failed to remove item');
    }
  }
}

export default PlaidService;