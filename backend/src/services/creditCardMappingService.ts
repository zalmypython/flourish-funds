import { db } from '../config/firebase';
import { encryptFinancialData, decryptFinancialData } from '../middleware/encryption';

export interface CreditCardMapping {
  id: string;
  userId: string;
  plaidAccountId: string;
  plaidAccountName: string;
  creditCardId: string;
  creditCardName: string;
  institutionName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default class CreditCardMappingService {
  private collection = 'credit_card_mappings';

  /**
   * Create a new mapping between Plaid account and credit card
   */
  async createMapping(
    userId: string,
    plaidAccountId: string,
    plaidAccountName: string,
    creditCardId: string,
    creditCardName: string,
    institutionName: string
  ): Promise<CreditCardMapping> {
    // Check if mapping already exists
    const existing = await this.getMappingByPlaidAccount(userId, plaidAccountId);
    if (existing) {
      throw new Error('Mapping already exists for this Plaid account');
    }

    const mapping: Omit<CreditCardMapping, 'id'> = {
      userId,
      plaidAccountId,
      plaidAccountName,
      creditCardId,
      creditCardName,
      institutionName,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const encryptedData = encryptFinancialData(mapping);
    const docRef = await db.collection(this.collection).add(encryptedData);

    return { id: docRef.id, ...mapping };
  }

  /**
   * Get mapping by Plaid account ID
   */
  async getMappingByPlaidAccount(
    userId: string,
    plaidAccountId: string
  ): Promise<CreditCardMapping | null> {
    try {
      const snapshot = await db.collection(this.collection)
        .where('userId', '==', userId)
        .where('plaidAccountId', '==', plaidAccountId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = decryptFinancialData(doc.data());
      return { id: doc.id, ...data } as CreditCardMapping;
    } catch (error) {
      console.error('Error fetching mapping:', error);
      return null;
    }
  }

  /**
   * Get all mappings for a user
   */
  async getUserMappings(userId: string): Promise<CreditCardMapping[]> {
    try {
      const snapshot = await db.collection(this.collection)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      return snapshot.docs.map(doc => {
        const data = decryptFinancialData(doc.data());
        return { id: doc.id, ...data } as CreditCardMapping;
      });
    } catch (error) {
      console.error('Error fetching user mappings:', error);
      return [];
    }
  }

  /**
   * Update mapping
   */
  async updateMapping(
    mappingId: string,
    userId: string,
    updates: Partial<Pick<CreditCardMapping, 'creditCardId' | 'creditCardName' | 'isActive'>>
  ): Promise<CreditCardMapping | null> {
    try {
      const docRef = db.collection(this.collection).doc(mappingId);
      const doc = await docRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      const encryptedData = encryptFinancialData(updateData);
      await docRef.update(encryptedData);

      const existingData = decryptFinancialData(doc.data()!);
      return { id: mappingId, ...existingData, ...updateData };
    } catch (error) {
      console.error('Error updating mapping:', error);
      return null;
    }
  }

  /**
   * Delete mapping
   */
  async deleteMapping(mappingId: string, userId: string): Promise<boolean> {
    try {
      const docRef = db.collection(this.collection).doc(mappingId);
      const doc = await docRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return false;
      }

      await this.updateMapping(mappingId, userId, { isActive: false });
      return true;
    } catch (error) {
      console.error('Error deleting mapping:', error);
      return false;
    }
  }

  /**
   * Get account mappings as a Map for quick lookup
   */
  async getAccountMappingsMap(
    userId: string
  ): Promise<Map<string, { accountType: 'bank' | 'credit'; creditCardId?: string }>> {
    const mappings = await this.getUserMappings(userId);
    const map = new Map();

    mappings.forEach(mapping => {
      map.set(mapping.plaidAccountId, {
        accountType: 'credit' as const,
        creditCardId: mapping.creditCardId
      });
    });

    return map;
  }

  /**
   * Auto-suggest mappings based on account names
   */
  async suggestMappings(
    userId: string,
    plaidAccounts: Array<{ accountId: string; name: string; type: string; institutionName: string }>,
    creditCards: Array<{ id: string; name: string; issuer: string }>
  ): Promise<Array<{
    plaidAccountId: string;
    plaidAccountName: string;
    suggestedCreditCardId: string;
    suggestedCreditCardName: string;
    confidence: number;
  }>> {
    const suggestions: Array<{
      plaidAccountId: string;
      plaidAccountName: string;
      suggestedCreditCardId: string;
      suggestedCreditCardName: string;
      confidence: number;
    }> = [];

    // Filter to credit accounts only
    const creditAccounts = plaidAccounts.filter(acc => 
      acc.type.toLowerCase().includes('credit') || 
      acc.name.toLowerCase().includes('credit')
    );

    creditAccounts.forEach(plaidAccount => {
      let bestMatch: typeof creditCards[0] | null = null;
      let bestScore = 0;

      creditCards.forEach(card => {
        let score = 0;

        // Compare institution/issuer names
        if (plaidAccount.institutionName.toLowerCase().includes(card.issuer.toLowerCase()) ||
            card.issuer.toLowerCase().includes(plaidAccount.institutionName.toLowerCase())) {
          score += 0.6;
        }

        // Compare account/card names
        const accountNameWords = plaidAccount.name.toLowerCase().split(/\s+/);
        const cardNameWords = card.name.toLowerCase().split(/\s+/);
        
        const commonWords = accountNameWords.filter(word => 
          cardNameWords.some(cardWord => 
            cardWord.includes(word) || word.includes(cardWord)
          )
        );

        if (commonWords.length > 0) {
          score += (commonWords.length / Math.max(accountNameWords.length, cardNameWords.length)) * 0.4;
        }

        if (score > bestScore && score > 0.3) { // Minimum confidence threshold
          bestScore = score;
          bestMatch = card;
        }
      });

      if (bestMatch) {
        suggestions.push({
          plaidAccountId: plaidAccount.accountId,
          plaidAccountName: plaidAccount.name,
          suggestedCreditCardId: bestMatch.id,
          suggestedCreditCardName: bestMatch.name,
          confidence: bestScore
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}