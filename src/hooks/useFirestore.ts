import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface FirebaseDocument {
  id: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export const useFirestore = <T extends FirebaseDocument>(collectionName: string) => {
  const [documents, setDocuments] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, collectionName),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      setDocuments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, collectionName]);

  const addDocument = async (data: Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add documents.",
        variant: "destructive"
      });
      return;
    }

    try {
      const docData = {
        ...data,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, collectionName), docData);
      
      toast({
        title: "Success",
        description: "Document added successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateDocument = async (id: string, data: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      
      toast({
        title: "Success",
        description: "Document updated successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      
      toast({
        title: "Success",
        description: "Document deleted successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    documents,
    loading,
    addDocument,
    updateDocument,
    deleteDocument
  };
};