import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import {
  AdvancedRoomCalculator,
  RoomMetrics,
  Wall,
} from '../lib/advanced-room-calculator';
import { AdvancedRoomDrawing, RoomDrawingState } from '../lib/advanced-room-drawing';

// Re-export types from calculator for consistency
export type { Point, Wall, RoomMetrics } from '../lib/advanced-room-calculator';
export type { DrawingRoom, RoomDrawingState } from '../lib/advanced-room-drawing';

export interface RoomState extends RoomDrawingState {
  // Keep legacy properties for backward compatibility
  walls: Wall[];
  metrics: RoomMetrics;
  name: string;
  viewMode: '2d' | '3d';
  editMode: 'draw' | 'move' | 'idle' | 'delete';
  selectedWallId: string | null;
  showMeasurements: boolean;
  showWindows: boolean;
  gridEnabled: boolean;
  showAdvancedMetrics: boolean;

  // New properties
  snapToGrid: boolean;
  wallHeight: number;
  defaultWallThickness: number;
}

const initialState: RoomState = {
  // Legacy properties
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

  // New properties
  snapToGrid: true,
  wallHeight: 2.8,
  defaultWallThickness: 0.25,

  // Room drawing state
  rooms: [],
  activeRoomId: null,
  drawingPoints: [],
  isDrawing: false,
};

// Helper function to recalculate metrics
const recalculateMetrics = (walls: Wall[]): RoomMetrics =>
  AdvancedRoomCalculator.calculateRoomMetrics(walls);

// Helper to sync legacy walls with room system
const syncLegacyWalls = (state: RoomState): void => {
  state.walls = AdvancedRoomDrawing.getAllWalls(state);
  // When multiple rooms exist, compute aggregate metrics per-room instead of flattening
  if (state.rooms && state.rooms.length > 0) {
    const roomWallsList = state.rooms.map((r) => r.walls);
    state.metrics = AdvancedRoomCalculator.calculateAggregateMetrics(roomWallsList);
  } else {
    state.metrics = recalculateMetrics(state.walls);
  }
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    // Legacy actions for backward compatibility
    setWalls: (state, action: PayloadAction<Wall[]>) => {
      state.walls = action.payload;
      state.metrics = recalculateMetrics(state.walls);
    },

    addWall: (state, action: PayloadAction<Wall>) => {
      state.walls.push(action.payload);
      state.metrics = recalculateMetrics(state.walls);
    },

    removeWall: (state, action: PayloadAction<string>) => {
      state.walls = state.walls.filter((wall) => wall.id !== action.payload);
      state.metrics = recalculateMetrics(state.walls);
    },

    updateWall: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Wall> }>,
    ) => {
      const { id, updates } = action.payload;
      const wallIndex = state.walls.findIndex((wall) => wall.id === id);
      if (wallIndex !== -1) {
        state.walls[wallIndex] = { ...state.walls[wallIndex], ...updates };
        state.metrics = recalculateMetrics(state.walls);
      }
    },

    // New advanced room drawing actions
    startNewRoom: (state, action: PayloadAction<string | undefined>) => {
      const newState = AdvancedRoomDrawing.startNewRoom(state, action.payload);
      Object.assign(state, newState);
      syncLegacyWalls(state);
    },

    addDrawingPoint: (state, action: PayloadAction<{ x: number; z: number }>) => {
      const newState = AdvancedRoomDrawing.addDrawingPoint(
        state,
        action.payload,
        state.wallHeight,
      );
      Object.assign(state, newState);
      syncLegacyWalls(state);
    },

    completeCurrentRoom: (state) => {
      const newState = AdvancedRoomDrawing.completeRoom(state, state.wallHeight);
      Object.assign(state, newState);
      syncLegacyWalls(state);
    },

    cancelCurrentRoom: (state) => {
      const newState = AdvancedRoomDrawing.cancelCurrentRoom(state);
      Object.assign(state, newState);
      syncLegacyWalls(state);
    },

    deleteRoom: (state, action: PayloadAction<string>) => {
      state.rooms = state.rooms.filter((room) => room.id !== action.payload);
      syncLegacyWalls(state);
    },

    updateRoomName: (state, action: PayloadAction<{ roomId: string; name: string }>) => {
      const room = state.rooms.find((r) => r.id === action.payload.roomId);
      if (room) {
        room.name = action.payload.name;
      }
    },

    // UI and settings actions
    setRoomName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },

    setViewMode: (state, action: PayloadAction<'2d' | '3d'>) => {
      state.viewMode = action.payload;
    },

    setEditMode: (state, action: PayloadAction<'draw' | 'move' | 'idle' | 'delete'>) => {
      state.editMode = action.payload;
    },

    setSelectedWall: (state, action: PayloadAction<string | null>) => {
      state.selectedWallId = action.payload;
    },

    setWallHeight: (state, action: PayloadAction<number>) => {
      state.wallHeight = action.payload;
    },

    setDefaultWallThickness: (state, action: PayloadAction<number>) => {
      state.defaultWallThickness = action.payload;
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

    toggleSnapToGrid: (state) => {
      state.snapToGrid = !state.snapToGrid;
    },

    toggleAdvancedMetrics: (state) => {
      state.showAdvancedMetrics = !state.showAdvancedMetrics;
    },

    clearAllRooms: (state) => {
      state.rooms = [];
      state.activeRoomId = null;
      state.drawingPoints = [];
      state.isDrawing = false;
      state.walls = [];
      state.metrics = recalculateMetrics([]);
      state.selectedWallId = null;
    },

    clearRoom: (state) => {
      // Legacy action - clear all for backward compatibility
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
  // Legacy actions for backward compatibility
  setWalls,
  addWall,
  removeWall,
  updateWall,
  clearRoom,
  loadTemplate,

  // New advanced room drawing actions
  startNewRoom,
  addDrawingPoint,
  completeCurrentRoom,
  cancelCurrentRoom,
  deleteRoom,
  updateRoomName,

  // UI and settings actions
  setRoomName,
  setViewMode,
  setEditMode,
  setSelectedWall,
  setWallHeight,
  setDefaultWallThickness,
  toggleMeasurements,
  toggleWindows,
  toggleGrid,
  toggleSnapToGrid,
  toggleAdvancedMetrics,
  clearAllRooms,
} = roomSlice.actions;

export default roomSlice.reducer;
