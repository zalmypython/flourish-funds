// src/services/baseService.ts
import { db } from '../config/firebase';
import { z } from 'zod';

export class BaseService<T> {
  constructor(private collectionName: string) {}

  async getAll(userId: string): Promise<T[]> {
    const snapshot = await db.collection(this.collectionName)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  }

  async getById(id: string, userId: string): Promise<T | null> {
    const doc = await db.collection(this.collectionName).doc(id).get();
    
    if (!doc.exists) return null;
    
    const data = doc.data();
    if (data?.userId !== userId) return null;
    
    return { id: doc.id, ...data } as T;
  }

  async create(data: Omit<T, 'id'> & { userId: string }): Promise<string> {
    const docRef = await db.collection(this.collectionName).add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return docRef.id;
  }

  async update(id: string, userId: string, data: Partial<T>): Promise<void> {
    const docRef = db.collection(this.collectionName).doc(id);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error('Document not found or access denied');
    }
    
    await docRef.update({
      ...data,
      updatedAt: new Date()
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const docRef = db.collection(this.collectionName).doc(id);
    
    // Verify ownership
    const doc = await docRef.get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      throw new Error('Document not found or access denied');
    }
    
    await docRef.delete();
  }
}