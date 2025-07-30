import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AdvancedRoomCalculator, RoomMetrics } from '../lib/advanced-room-calculator';

// Re-export types from calculator for consistency
export type { Point, Wall, RoomMetrics } from '../lib/advanced-room-calculator';

export interface RoomState {
  walls: Wall[];
  metrics: RoomMetrics;
  name: string;
  viewMode: '2d' | '3d';
  editMode: 'draw' | 'move' | 'idle';
  selectedWallId: string | null;
  showMeasurements: boolean;
  showWindows: boolean;
  gridEnabled: boolean;
  showAdvancedMetrics: boolean;
}

const initialState: RoomState = {
  walls: [],
  metrics: AdvancedRoomCalculator.calculateRoomMetrics([]),
  name: 'My Dream Room',
  viewMode: '2d',
  editMode: 'idle',
  selectedWallId: null,
  showMeasurements: true,
  showWindows: true,
  gridEnabled: true,
  showAdvancedMetrics: false,
};

// Helper function to recalculate metrics
const recalculateMetrics = (walls: Wall[]): RoomMetrics => {
  return AdvancedRoomCalculator.calculateRoomMetrics(walls);
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setWalls: (state, action: PayloadAction<Wall[]>) => {
      state.walls = action.payload;
      state.metrics = recalculateMetrics(state.walls);
    },
    
    addWall: (state, action: PayloadAction<Wall>) => {
      state.walls.push(action.payload);
      state.metrics = recalculateMetrics(state.walls);
    },
    
    removeWall: (state, action: PayloadAction<string>) => {
      state.walls = state.walls.filter(wall => wall.id !== action.payload);
      state.metrics = recalculateMetrics(state.walls);
    },
    
    updateWall: (state, action: PayloadAction<{ id: string; updates: Partial<Wall> }>) => {
      const { id, updates } = action.payload;
      const wallIndex = state.walls.findIndex(wall => wall.id === id);
      if (wallIndex !== -1) {
        state.walls[wallIndex] = { ...state.walls[wallIndex], ...updates };
        state.metrics = recalculateMetrics(state.walls);
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
    
    toggleAdvancedMetrics: (state) => {
      state.showAdvancedMetrics = !state.showAdvancedMetrics;
    },
    
    clearRoom: (state) => {
      state.walls = [];
      state.metrics = recalculateMetrics([]);
      state.selectedWallId = null;
    },
    
    loadTemplate: (state, action: PayloadAction<Wall[]>) => {
      state.walls = action.payload;
      state.metrics = recalculateMetrics(state.walls);
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
  toggleAdvancedMetrics,
  clearRoom,
  loadTemplate,
} = roomSlice.actions;

export default roomSlice.reducer;