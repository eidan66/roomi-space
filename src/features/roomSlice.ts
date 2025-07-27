import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Types
interface Point {
  x: number;
  z: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  height: number;
  thickness: number;
}

export interface RoomState {
  walls: Wall[];
  isValid: boolean;
  area: number;
  perimeter: number;
  name: string;
  viewMode: '2d' | '3d';
  editMode: 'draw' | 'move' | 'idle';
  selectedWallId: string | null;
  showMeasurements: boolean;
  showWindows: boolean;
  gridEnabled: boolean;
}

const initialState: RoomState = {
  walls: [],
  isValid: false,
  area: 0,
  perimeter: 0,
  name: 'My Dream Room',
  viewMode: '2d',
  editMode: 'idle',
  selectedWallId: null,
  showMeasurements: true,
  showWindows: true,
  gridEnabled: true,
};

// Helper functions
const calculateDistance = (a: Point, b: Point): number => 
  Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);

const calculateRoomArea = (walls: Wall[]): number => {
  if (walls.length < 3) return 0;
  
  // Get unique points
  const points: Point[] = [];
  walls.forEach(wall => {
    if (!points.some(p => calculateDistance(p, wall.start) < 0.01)) {
      points.push(wall.start);
    }
    if (!points.some(p => calculateDistance(p, wall.end) < 0.01)) {
      points.push(wall.end);
    }
  });
  
  if (points.length < 3) return 0;
  
  // Sort points to form a polygon
  const center = points.reduce(
    (acc, pt) => ({ x: acc.x + pt.x, z: acc.z + pt.z }),
    { x: 0, z: 0 }
  );
  center.x /= points.length;
  center.z /= points.length;
  
  const sortedPoints = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.z - center.z, a.x - center.x);
    const angleB = Math.atan2(b.z - center.z, b.x - center.x);
    return angleA - angleB;
  });
  
  // Calculate area using Shoelace formula
  let area = 0;
  for (let i = 0; i < sortedPoints.length; i++) {
    const j = (i + 1) % sortedPoints.length;
    area += sortedPoints[i].x * sortedPoints[j].z;
    area -= sortedPoints[j].x * sortedPoints[i].z;
  }
  
  return Math.abs(area) / 2;
};

const calculatePerimeter = (walls: Wall[]): number => 
  walls.reduce((sum, wall) => sum + calculateDistance(wall.start, wall.end), 0);

const isValidRoom = (walls: Wall[]): boolean => {
  if (walls.length < 3) return false;
  
  // Build a graph of connections
  const connections = new Map<string, Set<string>>();
  
  walls.forEach(wall => {
    const startKey = `${wall.start.x},${wall.start.z}`;
    const endKey = `${wall.end.x},${wall.end.z}`;
    
    if (!connections.has(startKey)) connections.set(startKey, new Set());
    if (!connections.has(endKey)) connections.set(endKey, new Set());
    
    connections.get(startKey)!.add(endKey);
    connections.get(endKey)!.add(startKey);
  });
  
  // Check that each point has exactly 2 connections (forms a loop)
  for (const [_, connected] of connections.entries()) {
    if (connected.size !== 2) return false;
  }
  
  return true;
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setWalls: (state, action: PayloadAction<Wall[]>) => {
      state.walls = action.payload;
      state.isValid = isValidRoom(state.walls);
      state.area = calculateRoomArea(state.walls);
      state.perimeter = calculatePerimeter(state.walls);
    },
    
    addWall: (state, action: PayloadAction<Wall>) => {
      state.walls.push(action.payload);
      state.isValid = isValidRoom(state.walls);
      state.area = calculateRoomArea(state.walls);
      state.perimeter = calculatePerimeter(state.walls);
    },
    
    removeWall: (state, action: PayloadAction<string>) => {
      state.walls = state.walls.filter(wall => wall.id !== action.payload);
      state.isValid = isValidRoom(state.walls);
      state.area = calculateRoomArea(state.walls);
      state.perimeter = calculatePerimeter(state.walls);
    },
    
    updateWall: (state, action: PayloadAction<{ id: string; updates: Partial<Wall> }>) => {
      const { id, updates } = action.payload;
      const wallIndex = state.walls.findIndex(wall => wall.id === id);
      if (wallIndex !== -1) {
        state.walls[wallIndex] = { ...state.walls[wallIndex], ...updates };
        state.isValid = isValidRoom(state.walls);
        state.area = calculateRoomArea(state.walls);
        state.perimeter = calculatePerimeter(state.walls);
      }
    },
    
    setRoomName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    
    setViewMode: (state, action: PayloadAction<'2d' | '3d'>) => {
      state.viewMode = action.payload;
    },
    
    setEditMode: (state, action: PayloadAction<'draw' | 'move' | 'idle'>) => {
      state.editMode = action.payload;
    },
    
    setSelectedWall: (state, action: PayloadAction<string | null>) => {
      state.selectedWallId = action.payload;
    },
    
    toggleMeasurements: (state) => {
      state.showMeasurements = !state.showMeasurements;
    },
    
    toggleWindows: (state) => {
      state.showWindows = !state.showWindows;
    },
    
    toggleGrid: (state) => {
      state.gridEnabled = !state.gridEnabled;
    },
    
    clearRoom: (state) => {
      state.walls = [];
      state.isValid = false;
      state.area = 0;
      state.perimeter = 0;
      state.selectedWallId = null;
    },
    
    loadTemplate: (state, action: PayloadAction<Wall[]>) => {
      state.walls = action.payload;
      state.isValid = isValidRoom(state.walls);
      state.area = calculateRoomArea(state.walls);
      state.perimeter = calculatePerimeter(state.walls);
      state.selectedWallId = null;
    },
  },
});

export const {
  setWalls,
  addWall,
  removeWall,
  updateWall,
  setRoomName,
  setViewMode,
  setEditMode,
  setSelectedWall,
  toggleMeasurements,
  toggleWindows,
  toggleGrid,
  clearRoom,
  loadTemplate,
} = roomSlice.actions;

export default roomSlice.reducer;