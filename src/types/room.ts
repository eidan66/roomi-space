export type Wall = {
  id: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  height: number;
  thickness: number;
};

export type RoomObject = {
  id: string;
  type: string; // e.g., "chair", "lamp"
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
};

export type Room = {
  id: string;
  userId: string;
  name: string;
  walls: Wall[];
  objects: RoomObject[];
  createdAt: string;
};
