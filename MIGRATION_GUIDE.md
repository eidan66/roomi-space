# Migration Guide: Enhanced Room Drawing System

## Overview

This guide helps you migrate from the existing room drawing system to the enhanced version with manual closing, multiple rooms, dynamic wall thickness, and improved floor rendering.

## Quick Start

### 1. Test the Enhanced System

To test the new system immediately, you can use the demo component:

```tsx
import EnhancedRoomBuilderDemo from '@/components/EnhancedRoomBuilderDemo';

// Use this in any page to test the full system
export default function TestPage() {
  return <EnhancedRoomBuilderDemo />;
}
```

### 2. Replace Existing Builder Page

To use the enhanced system as your main builder:

```tsx
// Replace your current builder page import
// OLD:
// import RoomBuilderPage from '@/app/builder/page';

// NEW:
import EnhancedRoomBuilderPage from '@/app/builder/enhanced-page';

// Or copy the enhanced-page.tsx content to your existing page.tsx
```

### 3. Add Redux Provider

Ensure your app has the Redux provider set up:

```tsx
// In your main layout or _app.tsx
import { Provider } from 'react-redux';
import { store } from '@/features/store';

export default function App({ children }) {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}
```

## Step-by-Step Migration

### Step 1: Update Dependencies

Make sure you have the required dependencies:

```bash
npm install @reduxjs/toolkit react-redux three three-stdlib
```

### Step 2: Component Integration

#### Option A: Full Replacement

Replace your existing 2D and 3D canvas components:

```tsx
// OLD components
import Floorplan2DCanvas from '@/components/Floorplan2DCanvas';
import ThreeCanvas from '@/components/ThreeCanvas';

// NEW enhanced components  
import EnhancedFloorplan2DCanvas from '@/components/EnhancedFloorplan2DCanvas';
import EnhancedThreeCanvas from '@/components/EnhancedThreeCanvas';
```

#### Option B: Gradual Integration

Keep existing components and add enhanced ones alongside:

```tsx
import { useState } from 'react';
import Floorplan2DCanvas from '@/components/Floorplan2DCanvas'; // Legacy
import EnhancedFloorplan2DCanvas from '@/components/EnhancedFloorplan2DCanvas'; // New

function MyBuilder() {
  const [useEnhanced, setUseEnhanced] = useState(false);
  
  return (
    <div>
      <button onClick={() => setUseEnhanced(!useEnhanced)}>
        Switch to {useEnhanced ? 'Legacy' : 'Enhanced'} Mode
      </button>
      
      {useEnhanced ? (
        <EnhancedFloorplan2DCanvas />
      ) : (
        <Floorplan2DCanvas />
      )}
    </div>
  );
}
```

### Step 3: State Management Migration

#### Current State Approach
```tsx
// OLD: Local state management
const [walls, setWalls] = useState<Wall[]>([]);
const [editMode, setEditMode] = useState<'draw' | 'move' | 'idle'>('idle');
```

#### New Redux Approach
```tsx
// NEW: Redux state management
import { useDispatch, useSelector } from 'react-redux';
import { setEditMode, startNewRoom, addDrawingPoint } from '@/features/roomSlice';

function MyComponent() {
  const dispatch = useDispatch();
  const { rooms, walls, editMode, isDrawing } = useSelector(state => state.room);
  
  // Start drawing
  const handleStartDrawing = () => {
    dispatch(startNewRoom());
    dispatch(setEditMode('draw'));
  };
}
```

### Step 4: Update Event Handlers

#### Legacy Click Handler
```tsx
// OLD: Direct wall addition
const handleCanvasClick = (point: Point) => {
  if (editMode === 'draw') {
    const newWall = createWall(lastPoint, point);
    setWalls(prev => [...prev, newWall]);
  }
};
```

#### Enhanced Click Handler
```tsx
// NEW: Redux action dispatch (handled automatically by EnhancedFloorplan2DCanvas)
// The enhanced canvas handles clicks internally and dispatches appropriate actions
// You can listen to state changes:

const { drawingPoints, activeRoomId } = useSelector(state => state.room);

useEffect(() => {
  console.log('Drawing progress:', drawingPoints.length, 'points');
}, [drawingPoints]);
```

### Step 5: Update Room Management

#### Legacy Single Room
```tsx
// OLD: Single room management
const clearRoom = () => setWalls([]);
const loadRoom = (roomWalls: Wall[]) => setWalls(roomWalls);
```

#### Enhanced Multiple Rooms
```tsx
// NEW: Multiple room management
import { clearAllRooms, deleteRoom, updateRoomName } from '@/features/roomSlice';

const handleClearAll = () => dispatch(clearAllRooms());
const handleDeleteRoom = (roomId: string) => dispatch(deleteRoom(roomId));
const handleRenameRoom = (roomId: string, name: string) => 
  dispatch(updateRoomName({ roomId, name }));
```

## Configuration Options

### Enhanced Canvas Props

```tsx
<EnhancedFloorplan2DCanvas
  width={800}
  height={600}
  className="border rounded-lg"
/>

<EnhancedThreeCanvas
  width={800}
  height={600}
  isDarkMode={false}
  floorType="wood" // 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet'
  wallMaterial="paint" // 'paint' | 'brick' | 'stone' | 'wood' | 'metal'
  showWindows={true}
  onScreenshot={(url) => console.log('Screenshot:', url)}
/>
```

### Redux Configuration

```tsx
// In your store configuration
import { configureStore } from '@reduxjs/toolkit';
import roomReducer from '@/features/roomSlice';

export const store = configureStore({
  reducer: {
    room: roomReducer,
    // ... other reducers
  },
});
```

## Backward Compatibility

The enhanced system maintains compatibility with existing code:

### Legacy Support
```tsx
// These still work and are automatically synced with the new system
const { walls } = useSelector(state => state.room); // Contains all walls from all rooms
dispatch(setWalls(newWalls)); // Still supported for compatibility
dispatch(addWall(wall)); // Still supported
```

### Data Migration
```tsx
// Convert legacy wall array to new room system
const migrateLegacyWalls = (legacyWalls: Wall[]) => {
  // Create a single room with all legacy walls
  const legacyRoom: DrawingRoom = {
    id: 'legacy-room',
    name: 'Migrated Room',
    walls: legacyWalls,
    isCompleted: true,
    parentRoomId: undefined,
    isActive: false,
  };
  
  // This would be handled automatically by the state migration
  return legacyRoom;
};
```

## Testing Your Migration

### 1. Basic Functionality Test
- Start new room
- Add multiple points by clicking
- Close room by clicking first point
- Verify room appears in room list

### 2. Multiple Room Test
- Create first room
- Start second room (Ctrl+N or button)
- Draw second room adjacent to first
- Verify both rooms exist independently

### 3. Nested Room Test
- Create outer room (house)
- Create inner room inside the outer room
- Verify wall thickness changes (inside walls should be 10cm)

### 4. Floor Rendering Test
- Switch to 3D view
- Verify floors render correctly for all room shapes
- Test with complex/irregular room shapes

### 5. Performance Test
- Create multiple rooms (5-10)
- Verify smooth interaction
- Check frame rate in 3D view

## Common Issues & Solutions

### Issue: Rooms not closing
**Solution**: Make sure you're clicking the first point (red circle), not other points

### Issue: Wall thickness not updating
**Solution**: Wall thickness recalculates after room completion. Wait for room to be marked as completed.

### Issue: Floor not rendering
**Solution**: Ensure room is properly closed and has at least 3 walls. Complex shapes may need a few seconds to process.

### Issue: Redux state not updating
**Solution**: Ensure Redux provider is set up correctly and components are inside the provider.

### Issue: Performance problems
**Solution**: Enable geometry optimization in EnhancedFloorRenderer options, or reduce room complexity.

## Advanced Customization

### Custom Wall Thickness Rules
```tsx
// Modify the wall thickness detection logic in AdvancedRoomDrawing
static recalculateWallThicknesses(rooms: DrawingRoom[]): DrawingRoom[] {
  // Your custom logic here
  // Default: inside = 10cm, outside = 25cm
}
```

### Custom Floor Materials
```tsx
// Add custom floor materials in EnhancedThreeCanvas
const createFloorMaterial = (type: string): THREE.Material => {
  switch (type) {
    case 'custom':
      material.color.setHex(0x123456);
      break;
    // ... existing cases
  }
};
```

### Custom Validation Rules
```tsx
// Modify room validation in AdvancedRoomDrawing
static validateRoom(room: DrawingRoom): { isValid: boolean; errors: string[] } {
  // Add custom validation rules
  const errors: string[] = [];
  
  // Your custom validation logic
  
  return { isValid: errors.length === 0, errors };
}
```

## Support

If you encounter issues during migration:

1. Check the console for any error messages
2. Verify Redux store is properly configured
3. Ensure all required dependencies are installed
4. Test with the provided demo component first
5. Review the implementation files for detailed examples

The enhanced system is designed to be a drop-in replacement with additional features, so most existing code should continue to work with minimal changes.