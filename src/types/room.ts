export type Wall = {
  id: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  height: number;
  thickness: number;
  color?: string;
  material?: string;
  texture?: string;
};

export type Door = {
  id: string;
  wallId: string;
  position: number; // Position along the wall (0-1)
  width: number;
  height: number;
  type: 'single' | 'double' | 'sliding';
};

export type Window = {
  id: string;
  wallId: string;
  position: number; // Position along the wall (0-1)
  width: number;
  height: number;
  sillHeight: number;
  type: 'standard' | 'bay' | 'casement';
};

export type RoomObject = {
  id: string;
  type: string; // e.g., "chair", "table", "lamp", "sofa"
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  material?: string;
  texture?: string;
};

export type Room = {
  id: string;
  userId?: string;
  name: string;
  walls: Wall[];
  doors?: Door[];
  windows?: Window[];
  objects: RoomObject[];
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  isPublic?: boolean;
};

export type RoomTemplate = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  walls: Wall[];
  doors?: Door[];
  windows?: Window[];
  category: 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'office' | 'other';
};
