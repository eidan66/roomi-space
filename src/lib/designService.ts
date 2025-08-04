import {
  ref,
  set,
  get,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
  serverTimestamp,
} from 'firebase/database';
import { realtimeDb } from '@/firebase/firebase';

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
    userData: any;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const designService = {
  // Test function to check Realtime Database access
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔧 Testing Realtime Database read access...');
      const testRef = ref(realtimeDb, 'test');
      await get(testRef);
      console.log('✅ Realtime Database read access OK');
      
      console.log('🔧 Testing Realtime Database write access...');
      const testData = {
        test: true,
        timestamp: serverTimestamp(),
      };
      await set(ref(realtimeDb, 'test'), testData);
      console.log('✅ Realtime Database write access OK');
      
      // Clean up test data
      await remove(ref(realtimeDb, 'test'));
      console.log('✅ Test data cleaned up');
      
      return true;
    } catch (error) {
      console.error('❌ Realtime Database test failed:', error);
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

      console.log('🔧 Adding document to Realtime Database...');
      const designsRef = ref(realtimeDb, 'designs');
      const newDesignRef = push(designsRef);
      await set(newDesignRef, designData);
      console.log('🔧 Document added with ID:', newDesignRef.key);
      return newDesignRef.key!;
    } catch (error) {
      console.error('❌ Realtime Database error:', error);
      console.error('❌ Error code:', (error as any)?.code);
      console.error('❌ Error message:', (error as any)?.message);
      throw error;
    }
  },

  async updateDesign(designId: string, design: Partial<SavedDesign>): Promise<void> {
    console.log('🔧 designService.updateDesign called with ID:', designId);
    
    const designRef = ref(realtimeDb, `designs/${designId}`);
    await update(designRef, {
      ...design,
      updatedAt: serverTimestamp(),
    });
    console.log('🔧 Document updated successfully');
  },

  async getUserDesigns(userId: string): Promise<SavedDesign[]> {
    try {
      const designsRef = ref(realtimeDb, 'designs');
      const userDesignsQuery = query(designsRef, orderByChild('userId'), equalTo(userId));
      const snapshot = await get(userDesignsQuery);
      
      if (!snapshot.exists()) {
        return [];
      }

      const designs: SavedDesign[] = [];
      snapshot.forEach((childSnapshot) => {
        designs.push({
          id: childSnapshot.key!,
          ...childSnapshot.val(),
          createdAt: childSnapshot.val().createdAt ? new Date(childSnapshot.val().createdAt) : new Date(),
          updatedAt: childSnapshot.val().updatedAt ? new Date(childSnapshot.val().updatedAt) : new Date(),
        });
      });

      return designs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    } catch (error) {
      console.error('Error fetching user designs:', error);
      throw error;
    }
  },

  subscribeToUserDesigns(
    userId: string,
    callback: (designs: SavedDesign[]) => void,
  ): () => void {
    const designsRef = ref(realtimeDb, 'designs');
    const userDesignsQuery = query(designsRef, orderByChild('userId'), equalTo(userId));
    
    const unsubscribe = onValue(userDesignsQuery, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const designs: SavedDesign[] = [];
      snapshot.forEach((childSnapshot) => {
        designs.push({
          id: childSnapshot.key!,
          ...childSnapshot.val(),
          createdAt: childSnapshot.val().createdAt ? new Date(childSnapshot.val().createdAt) : new Date(),
          updatedAt: childSnapshot.val().updatedAt ? new Date(childSnapshot.val().updatedAt) : new Date(),
        });
      });

             callback(designs.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)));
    });

    return () => off(designsRef, 'value', unsubscribe);
  },

  subscribeToDesign(designId: string, callback: (design: SavedDesign | null) => void): () => void {
    const designRef = ref(realtimeDb, `designs/${designId}`);
    
    const unsubscribe = onValue(designRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const design: SavedDesign = {
        id: snapshot.key!,
        ...snapshot.val(),
        createdAt: snapshot.val().createdAt ? new Date(snapshot.val().createdAt) : new Date(),
        updatedAt: snapshot.val().updatedAt ? new Date(snapshot.val().updatedAt) : new Date(),
      };

      callback(design);
    });

    return () => off(designRef, 'value', unsubscribe);
  },

  async autoSaveDesign(designId: string, design: Partial<SavedDesign>): Promise<void> {
    const designRef = ref(realtimeDb, `designs/${designId}`);
    await update(designRef, {
      ...design,
      updatedAt: serverTimestamp(),
    });
  },

  async createDesignWithAutoSave(design: Omit<SavedDesign, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const designData = {
      ...design,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const designsRef = ref(realtimeDb, 'designs');
    const newDesignRef = push(designsRef);
    await set(newDesignRef, designData);
    return newDesignRef.key!;
  },

  async deleteDesign(designId: string): Promise<void> {
    const designRef = ref(realtimeDb, `designs/${designId}`);
    await remove(designRef);
  },
};
