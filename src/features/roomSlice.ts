import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Wall, Room, RoomObject, Door, Window } from '@/types/room';
import { RoomSizeKey } from '@/config/roomSizes';

type Tool =
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'drag'
  | 'paint'
  | 'delete'
  | 'resize';
type ViewMode = '3d' | '2d';
type CategoryType =
  | 'furniture'
  | 'carpets'
  | 'lamps'
  | 'appliances'
  | 'decorative'
  | 'textures'
  | 'walls'
  | 'floors';

interface RoomState {
  currentRoom: Room | null;
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  objects: RoomObject[];
  selectedWallId: string | null;
  selectedObjectId: string | null;
  selectedDoorId: string | null;
  selectedWindowId: string | null;
  isDrawing: boolean;
  drawingStart: { x: number; z: number } | null;
  selectedTool: Tool;
  viewMode: ViewMode;
  isPremiumMode: boolean;
  roomSize: RoomSizeKey;
  activeCategory: CategoryType;
  gridEnabled: boolean;
  snapToGrid: boolean;
  wallHeight: number;
  wallThickness: number;
  wallColor: string;
  floorColor: string;
  selectedColor: string;
  colorPalette: string[];
  undoStack: any[][];
  redoStack: any[][];
  showColorPalette: boolean;
  firstPersonMode: boolean;
  hudEnabled: boolean;
  lightingEnabled: boolean;
}

const initialState: RoomState = {
  currentRoom: null,
  walls: [],
  doors: [],
  windows: [],
  objects: [],
  selectedWallId: null,
  selectedObjectId: null,
  selectedDoorId: null,
  selectedWindowId: null,
  isDrawing: false,
  drawingStart: null,
  selectedTool: 'select',
  viewMode: '3d',
  isPremiumMode: false,
  roomSize: 'm',
  activeCategory: 'furniture',
  gridEnabled: true,
  snapToGrid: true,
  wallHeight: 2.5,
  wallThickness: 0.1,
  wallColor: '#a0aec0',
  floorColor: '#f0f0f0',
  selectedColor: '#a0aec0',
  colorPalette: [
    '#ffffff',
    '#f8f9fa',
    '#e9ecef',
    '#dee2e6',
    '#ced4da',
    '#adb5bd',
    '#6c757d',
    '#495057',
    '#343a40',
    '#212529',
    '#ff6b6b',
    '#ee5a52',
    '#fd7e14',
    '#ffc107',
    '#28a745',
    '#20c997',
    '#17a2b8',
    '#007bff',
    '#6610f2',
    '#e83e8c',
  ],
  undoStack: [],
  redoStack: [],
  showColorPalette: false,
  firstPersonMode: false,
  hudEnabled: true,
  lightingEnabled: true,
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setWalls: (state, action: PayloadAction<Wall[]>) => {
      state.walls = action.payload;
    },
    addWall: (state, action: PayloadAction<Wall>) => {
      state.undoStack.push([...state.walls]);
      state.redoStack = [];
      state.walls.push(action.payload);
    },
    updateWall: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Wall> }>,
    ) => {
      state.undoStack.push([...state.walls]);
      state.redoStack = [];
      const wallIndex = state.walls.findIndex((wall) => wall.id === action.payload.id);
      if (wallIndex !== -1) {
        state.walls[wallIndex] = { ...state.walls[wallIndex], ...action.payload.updates };
      }
    },
    deleteWall: (state, action: PayloadAction<string>) => {
      state.undoStack.push([...state.walls]);
      state.redoStack = [];
      state.walls = state.walls.filter((wall) => wall.id !== action.payload);
      if (state.selectedWallId === action.payload) {
        state.selectedWallId = null;
      }
    },
    setSelectedWallId: (state, action: PayloadAction<string | null>) => {
      state.selectedWallId = action.payload;
    },
    setIsDrawing: (state, action: PayloadAction<boolean>) => {
      state.isDrawing = action.payload;
    },
    setDrawingStart: (state, action: PayloadAction<{ x: number; z: number } | null>) => {
      state.drawingStart = action.payload;
    },
    setSelectedTool: (state, action: PayloadAction<Tool>) => {
      state.selectedTool = action.payload;
      state.isDrawing = false;
      state.drawingStart = null;
      state.showColorPalette = action.payload === 'paint';
    },
    setGridEnabled: (state, action: PayloadAction<boolean>) => {
      state.gridEnabled = action.payload;
    },
    setSnapToGrid: (state, action: PayloadAction<boolean>) => {
      state.snapToGrid = action.payload;
    },
    setWallHeight: (state, action: PayloadAction<number>) => {
      state.wallHeight = action.payload;
    },
    setWallThickness: (state, action: PayloadAction<number>) => {
      state.wallThickness = action.payload;
    },
    setWallColor: (state, action: PayloadAction<string>) => {
      state.wallColor = action.payload;
    },
    clearAll: (state) => {
      state.undoStack.push([...state.walls]);
      state.redoStack = [];
      state.walls = [];
      state.selectedWallId = null;
      state.isDrawing = false;
      state.drawingStart = null;
    },
    undo: (state) => {
      if (state.undoStack.length > 0) {
        const previousState = state.undoStack[state.undoStack.length - 1];
        state.redoStack.unshift([...state.walls]);
        state.undoStack.pop();
        state.walls = previousState;
        state.selectedWallId = null;
        state.isDrawing = false;
        state.drawingStart = null;
      }
    },
    redo: (state) => {
      if (state.redoStack.length > 0) {
        const nextState = state.redoStack[0];
        state.undoStack.push([...state.walls]);
        state.redoStack.shift();
        state.walls = nextState;
        state.selectedWallId = null;
        state.isDrawing = false;
        state.drawingStart = null;
      }
    },
    setCurrentRoom: (state, action: PayloadAction<Room | null>) => {
      state.currentRoom = action.payload;
      if (action.payload) {
        state.walls = action.payload.walls;
        state.doors = action.payload.doors || [];
        state.windows = action.payload.windows || [];
        state.objects = action.payload.objects || [];
      }
    },
    // New actions for enhanced functionality
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    setIsPremiumMode: (state, action: PayloadAction<boolean>) => {
      state.isPremiumMode = action.payload;
    },
    setRoomSize: (state, action: PayloadAction<RoomSizeKey>) => {
      state.roomSize = action.payload;
    },
    setActiveCategory: (state, action: PayloadAction<CategoryType>) => {
      state.activeCategory = action.payload;
    },
    setSelectedObjectId: (state, action: PayloadAction<string | null>) => {
      state.selectedObjectId = action.payload;
    },
    setSelectedDoorId: (state, action: PayloadAction<string | null>) => {
      state.selectedDoorId = action.payload;
    },
    setSelectedWindowId: (state, action: PayloadAction<string | null>) => {
      state.selectedWindowId = action.payload;
    },
    setFloorColor: (state, action: PayloadAction<string>) => {
      state.floorColor = action.payload;
    },
    setSelectedColor: (state, action: PayloadAction<string>) => {
      state.selectedColor = action.payload;
    },
    setShowColorPalette: (state, action: PayloadAction<boolean>) => {
      state.showColorPalette = action.payload;
    },
    setFirstPersonMode: (state, action: PayloadAction<boolean>) => {
      state.firstPersonMode = action.payload;
    },
    setHudEnabled: (state, action: PayloadAction<boolean>) => {
      state.hudEnabled = action.payload;
    },
    setLightingEnabled: (state, action: PayloadAction<boolean>) => {
      state.lightingEnabled = action.payload;
    },
    // Object management
    addObject: (state, action: PayloadAction<RoomObject>) => {
      state.undoStack.push([...state.objects]);
      state.redoStack = [];
      state.objects.push(action.payload);
    },
    updateObject: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<RoomObject> }>,
    ) => {
      state.undoStack.push([...state.objects]);
      state.redoStack = [];
      const objectIndex = state.objects.findIndex((obj) => obj.id === action.payload.id);
      if (objectIndex !== -1) {
        state.objects[objectIndex] = {
          ...state.objects[objectIndex],
          ...action.payload.updates,
        };
      }
    },
    deleteObject: (state, action: PayloadAction<string>) => {
      state.undoStack.push([...state.objects]);
      state.redoStack = [];
      state.objects = state.objects.filter((obj) => obj.id !== action.payload);
      if (state.selectedObjectId === action.payload) {
        state.selectedObjectId = null;
      }
    },
    // Door management
    addDoor: (state, action: PayloadAction<Door>) => {
      state.undoStack.push([...state.doors]);
      state.redoStack = [];
      state.doors.push(action.payload);
    },
    updateDoor: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Door> }>,
    ) => {
      state.undoStack.push([...state.doors]);
      state.redoStack = [];
      const doorIndex = state.doors.findIndex((door) => door.id === action.payload.id);
      if (doorIndex !== -1) {
        state.doors[doorIndex] = { ...state.doors[doorIndex], ...action.payload.updates };
      }
    },
    deleteDoor: (state, action: PayloadAction<string>) => {
      state.undoStack.push([...state.doors]);
      state.redoStack = [];
      state.doors = state.doors.filter((door) => door.id !== action.payload);
      if (state.selectedDoorId === action.payload) {
        state.selectedDoorId = null;
      }
    },
    // Window management
    addWindow: (state, action: PayloadAction<Window>) => {
      state.undoStack.push([...state.windows]);
      state.redoStack = [];
      state.windows.push(action.payload);
    },
    updateWindow: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Window> }>,
    ) => {
      state.undoStack.push([...state.windows]);
      state.redoStack = [];
      const windowIndex = state.windows.findIndex(
        (window) => window.id === action.payload.id,
      );
      if (windowIndex !== -1) {
        state.windows[windowIndex] = {
          ...state.windows[windowIndex],
          ...action.payload.updates,
        };
      }
    },
    deleteWindow: (state, action: PayloadAction<string>) => {
      state.undoStack.push([...state.windows]);
      state.redoStack = [];
      state.windows = state.windows.filter((window) => window.id !== action.payload);
      if (state.selectedWindowId === action.payload) {
        state.selectedWindowId = null;
      }
    },
  },
});

export const {
  setWalls,
  addWall,
  updateWall,
  deleteWall,
  setSelectedWallId,
  setIsDrawing,
  setDrawingStart,
  setSelectedTool,
  setGridEnabled,
  setSnapToGrid,
  setWallHeight,
  setWallThickness,
  setWallColor,
  clearAll,
  undo,
  redo,
  setCurrentRoom,
  // New exports
  setViewMode,
  setIsPremiumMode,
  setRoomSize,
  setActiveCategory,
  setSelectedObjectId,
  setSelectedDoorId,
  setSelectedWindowId,
  setFloorColor,
  setSelectedColor,
  setShowColorPalette,
  setFirstPersonMode,
  setHudEnabled,
  setLightingEnabled,
  addObject,
  updateObject,
  deleteObject,
  addDoor,
  updateDoor,
  deleteDoor,
  addWindow,
  updateWindow,
  deleteWindow,
} = roomSlice.actions;

export default roomSlice.reducer;
