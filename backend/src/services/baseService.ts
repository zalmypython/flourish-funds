import { db } from '../config/firebase';
import { encryptFinancialData, decryptFinancialData } from '../middleware/encryption';
import { auditLog } from '../middleware/auditLogger';

export class BaseService<T> {
  constructor(private collectionName: string) {}

  async getAll(userId: string): Promise<T[]> {
    try {
      const snapshot = await db.collection(this.collectionName)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...decryptFinancialData(data)
        };
      }) as T[];

      auditLog({
        event: `${this.collectionName}_read_all`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { count: results.length }
      });

      return results;
    } catch (error: any) {
      auditLog({
        event: `${this.collectionName}_read_all_failed`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { error: error.message }
      });
      throw error;
    }
  }

  async getById(id: string, userId: string): Promise<T | null> {
    try {
      const doc = await db.collection(this.collectionName).doc(id).get();
      
      if (!doc.exists) {
        auditLog({
          event: `${this.collectionName}_read_not_found`,
          userId,
          ip: 'server',
          userAgent: 'server',
          timestamp: new Date(),
          details: { id }
        });
        return null;
      }
      
      const data = doc.data();
      if (data?.userId !== userId) {
        auditLog({
          event: `${this.collectionName}_read_access_denied`,
          userId,
          ip: 'server',
          userAgent: 'server',
          timestamp: new Date(),
          details: { id, attemptedAccess: data?.userId }
        });
        return null;
      }

      const result = { 
        id: doc.id, 
        ...decryptFinancialData(data) 
      } as T;

      auditLog({
        event: `${this.collectionName}_read_by_id`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { id }
      });

      return result;
    } catch (error: any) {
      auditLog({
        event: `${this.collectionName}_read_by_id_failed`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { id, error: error.message }
      });
      throw error;
    }
  }

  async create(data: Omit<T, 'id'> & { userId: string }): Promise<string> {
    try {
      const encryptedData = encryptFinancialData(data);
      
      const docRef = await db.collection(this.collectionName).add({
        ...encryptedData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      auditLog({
        event: `${this.collectionName}_created`,
        userId: data.userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { id: docRef.id }
      });

      return docRef.id;
    } catch (error: any) {
      auditLog({
        event: `${this.collectionName}_create_failed`,
        userId: data.userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { error: error.message }
      });
      throw error;
    }
  }

  async update(id: string, userId: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = db.collection(this.collectionName).doc(id);
      
      // Verify ownership
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.userId !== userId) {
        auditLog({
          event: `${this.collectionName}_update_access_denied`,
          userId,
          ip: 'server',
          userAgent: 'server',
          timestamp: new Date(),
          details: { id, attemptedAccess: doc.data()?.userId }
        });
        throw new Error('Document not found or access denied');
      }

      const encryptedData = encryptFinancialData(data);
      
      await docRef.update({
        ...encryptedData,
        updatedAt: new Date()
      });

      auditLog({
        event: `${this.collectionName}_updated`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { id }
      });
    } catch (error: any) {
      auditLog({
        event: `${this.collectionName}_update_failed`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { id, error: error.message }
      });
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const docRef = db.collection(this.collectionName).doc(id);
      
      // Verify ownership
      const doc = await docRef.get();
      if (!doc.exists || doc.data()?.userId !== userId) {
        auditLog({
          event: `${this.collectionName}_delete_access_denied`,
          userId,
          ip: 'server',
          userAgent: 'server',
          timestamp: new Date(),
          details: { id, attemptedAccess: doc.data()?.userId }
        });
        throw new Error('Document not found or access denied');
      }
      
      await docRef.delete();

      auditLog({
        event: `${this.collectionName}_deleted`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { id }
      });
    } catch (error: any) {
      auditLog({
        event: `${this.collectionName}_delete_failed`,
        userId,
        ip: 'server',
        userAgent: 'server',
        timestamp: new Date(),
        details: { id, error: error.message }
      });
      throw error;
    }
  }
}