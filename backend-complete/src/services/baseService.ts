import { db } from '../config/firebase';
import { z } from 'zod';
import { encryptFinancialData, decryptFinancialData } from '../middleware/encryption';
import { auditLog } from '../middleware/auditLogger';

export class BaseService<T> {
  constructor(private collectionName: string) {}

  async getAll(userId: string): Promise<T[]> {
    const snapshot = await db.collection(this.collectionName)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const docs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...decryptFinancialData(data)
      };
    }) as T[];
    
    // Log data access
    auditLog({
      userId,
      action: 'getAll',
      resource: this.collectionName,
      ip: 'server',
      userAgent: 'server',
      success: true,
      additionalData: { count: docs.length }
    });
    
    return docs;
  }

  async getById(id: string, userId: string): Promise<T | null> {
    const doc = await db.collection(this.collectionName).doc(id).get();
    
    if (!doc.exists) {
      auditLog({
        userId,
        action: 'getById',
        resource: this.collectionName,
        resourceId: id,
        ip: 'server',
        userAgent: 'server',
        success: false,
        error: 'Document not found'
      });
      return null;
    }
    
    const data = doc.data();
    if (data?.userId !== userId) {
      auditLog({
        userId,
        action: 'getById',
        resource: this.collectionName,
        resourceId: id,
        ip: 'server',
        userAgent: 'server',
        success: false,
        error: 'Access denied'
      });
      return null;
    }
    
    auditLog({
      userId,
      action: 'getById',
      resource: this.collectionName,
      resourceId: id,
      ip: 'server',
      userAgent: 'server',
      success: true
    });
    
    return { id: doc.id, ...decryptFinancialData(data) } as T;
  }

  async create(data: Omit<T, 'id'> & { userId: string }): Promise<string> {
    const encryptedData = encryptFinancialData(data);
    
    const docRef = await db.collection(this.collectionName).add({
      ...encryptedData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    auditLog({
      userId: data.userId,
      action: 'create',
      resource: this.collectionName,
      resourceId: docRef.id,
      ip: 'server',
      userAgent: 'server',
      success: true
    });
    
    return docRef.id;
  }

  async update(id: string, userId: string, data: Partial<T>): Promise<void> {
    const docRef = db.collection(this.collectionName).doc(id);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      auditLog({
        userId,
        action: 'update',
        resource: this.collectionName,
        resourceId: id,
        ip: 'server',
        userAgent: 'server',
        success: false,
        error: 'Document not found or access denied'
      });
      throw new Error('Document not found or access denied');
    }
    
    const encryptedData = encryptFinancialData(data);
    
    await docRef.update({
      ...encryptedData,
      updatedAt: new Date()
    });
    
    auditLog({
      userId,
      action: 'update',
      resource: this.collectionName,
      resourceId: id,
      ip: 'server',
      userAgent: 'server',
      success: true
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const docRef = db.collection(this.collectionName).doc(id);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      auditLog({
        userId,
        action: 'delete',
        resource: this.collectionName,
        resourceId: id,
        ip: 'server',
        userAgent: 'server',
        success: false,
        error: 'Document not found or access denied'
      });
      throw new Error('Document not found or access denied');
    }
    
    await docRef.delete();
    
    auditLog({
      userId,
      action: 'delete',
      resource: this.collectionName,
      resourceId: id,
      ip: 'server',
      userAgent: 'server',
      success: true
    });
  }
}