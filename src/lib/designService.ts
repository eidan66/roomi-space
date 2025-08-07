import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase/firebase';

export interface SavedDesign {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  walls: Array<{
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    height: number;
    thickness: number;
  }>;
  objects: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    userData: Record<string, unknown>;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const designService = {
  // Test function to check Firestore access
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔧 Testing Firestore read access...');
      const testCollection = collection(db, 'test');
      await getDocs(testCollection);
      console.log('✅ Firestore read access OK');

      console.log('🔧 Testing Firestore write access...');
      const testData = {
        test: true,
        timestamp: serverTimestamp(),
      };
      const testDocRef = doc(db, 'test', 'connection-test');
      await setDoc(testDocRef, testData);
      console.log('✅ Firestore write access OK');

      // Clean up test data
      await deleteDoc(testDocRef);
      console.log('✅ Test data cleaned up');

      return true;
    } catch (error) {
      console.error('❌ Firestore test failed:', error);
      return false;
    }
  },

  async saveDesign(
    design: Omit<SavedDesign, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    console.log('🔧 designService.saveDesign called with:', design);

    try {
      const designData = {
        ...design,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('🔧 Adding document to Firestore...');
      const designsCollection = collection(db, 'designs');
      const docRef = await addDoc(designsCollection, designData);
      console.log('🔧 Document added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Firestore error:', error);
      console.error('❌ Error code:', (error as Error & { code?: string })?.code);
      console.error('❌ Error message:', (error as Error)?.message);
      throw error;
    }
  },

  async updateDesign(designId: string, design: Partial<SavedDesign>): Promise<void> {
    console.log('🔧 designService.updateDesign called with ID:', designId);

    const designRef = doc(db, 'designs', designId);
    await updateDoc(designRef, {
      ...design,
      updatedAt: serverTimestamp(),
    });
    console.log('🔧 Document updated successfully');
  },

  async getUserDesigns(userId: string): Promise<SavedDesign[]> {
    try {
      const designsCollection = collection(db, 'designs');
      const userDesignsQuery = query(
        designsCollection,
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
      );
      const snapshot = await getDocs(userDesignsQuery);

      if (snapshot.empty) {
        return [];
      }

      const designs: SavedDesign[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        designs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as SavedDesign);
      });

      return designs;
    } catch (error) {
      console.error('Error fetching user designs:', error);

      // Handle index error specifically
      if ((error as Error & { code?: string }).code === 'failed-precondition') {
        console.error(
          'Firestore index error. Please create the required index:',
          (error as Error & { code?: string }).message,
        );
        // Return empty array instead of throwing to prevent UI crashes
        return [];
      }

      throw error;
    }
  },

  subscribeToUserDesigns(
    userId: string,
    callback: (designs: SavedDesign[]) => void,
  ): () => void {
    const designsCollection = collection(db, 'designs');
    const userDesignsQuery = query(
      designsCollection,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      userDesignsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          callback([]);
          return;
        }

        const designs: SavedDesign[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          designs.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as SavedDesign);
        });

        callback(designs);
      },
      (error) => {
        console.error('Error in design subscription:', error);

        // Handle index error specifically
        if (error.code === 'failed-precondition') {
          console.error(
            'Firestore index error. Please create the required index:',
            error.message,
          );
          // Still call callback with empty array to prevent UI from breaking
          callback([]);
        } else {
          // For other errors, still provide empty array to prevent crashes
          callback([]);
        }
      },
    );

    return unsubscribe;
  },

  subscribeToDesign(
    designId: string,
    callback: (design: SavedDesign | null) => void,
  ): () => void {
    const designRef = doc(db, 'designs', designId);

    const unsubscribe = onSnapshot(designRef, (doc) => {
      if (!doc.exists()) {
        callback(null);
        return;
      }

      const data = doc.data();
      const design: SavedDesign = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as SavedDesign;

      callback(design);
    });

    return unsubscribe;
  },

  async autoSaveDesign(designId: string, design: Partial<SavedDesign>): Promise<void> {
    const designRef = doc(db, 'designs', designId);
    await updateDoc(designRef, {
      ...design,
      updatedAt: serverTimestamp(),
    });
  },

  async createDesignWithAutoSave(
    design: Omit<SavedDesign, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const designData = {
      ...design,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const designsCollection = collection(db, 'designs');
    const docRef = await addDoc(designsCollection, designData);
    return docRef.id;
  },

  async deleteDesign(designId: string): Promise<void> {
    const designRef = doc(db, 'designs', designId);
    await deleteDoc(designRef);
  },
};
