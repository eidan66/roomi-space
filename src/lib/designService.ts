import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

import { db } from '@/firebase/firebase';

export interface SavedDesign {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  walls: Array<{
    id: string;
    start: { x: number; z: number };
    end: { x: number; z: number };
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
  roomMetrics?: {
    area: number;
    perimeter: number;
    wallCount: number;
    averageWallLength: number;
    rectangularity: number;
    convexity: number;
    compactness: number;
    usableArea: number;
    wallToFloorRatio: number;
  };
}

export const designService = {
  async saveDesign(
    design: Omit<SavedDesign, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const designData = {
      ...design,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'designs'), designData);
    return docRef.id;
  },

  async updateDesign(designId: string, design: Partial<SavedDesign>): Promise<void> {
    const designRef = doc(db, 'designs', designId);
    await updateDoc(designRef, {
      ...design,
      updatedAt: new Date(),
    });
  },

  async getUserDesigns(userId: string): Promise<SavedDesign[]> {
    const q = query(collection(db, 'designs'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as SavedDesign[];
  },

  async deleteDesign(designId: string): Promise<void> {
    const designRef = doc(db, 'designs', designId);
    await deleteDoc(designRef);
  },

  async getDesign(designId: string): Promise<SavedDesign | null> {
    const designDoc = await getDocs(
      query(collection(db, 'designs'), where('__name__', '==', designId)),
    );

    if (designDoc.empty) {
      return null;
    }

    const docData = designDoc.docs[0].data();
    return {
      id: designDoc.docs[0].id,
      ...docData,
      createdAt: docData.createdAt?.toDate() || new Date(),
      updatedAt: docData.updatedAt?.toDate() || new Date(),
    } as SavedDesign;
  },
};
