'use client';

import React from 'react';
import * as THREE from 'three';
import { useTheme } from 'next-themes';
import { useDispatch, useSelector } from 'react-redux';
import HeaderToolbar from '@/components/layout/HeaderToolbar';
import ModelSidebar from '@/components/layout/ModelSidebar';
import ThreeCanvas from '@/components/ThreeCanvas';
import ColorPalette from '@/components/ui/ColorPalette';
import { ROOM_SIZES } from '@/config/roomSizes';
import { RootState } from '@/features/store';
import {
  addWall,
  setSelectedObjectId,
  setSelectedWallId,
  updateObject,
} from '@/features/roomSlice';

export default function RoomBuilderPage() {
  const dispatch = useDispatch();
  const { theme } = useTheme();

  const {
    walls,
    objects,
    doors,
    windows,
    selectedTool,
    selectedWallId,
    selectedObjectId,
    selectedDoorId,
    selectedWindowId,
    gridEnabled,
    snapToGrid,
    isDrawing,
    drawingStart,
    viewMode,
    firstPersonMode,
    selectedColor,
    floorColor,
    roomSize,
    hudEnabled,
    wallHeight,
    wallThickness,
    wallColor,
  } = useSelector((state: RootState) => state.room);

  const currentRoomSize = ROOM_SIZES[roomSize];

  const snapToGridValue = (value: number) => {
    if (!snapToGrid) {
      return value;
    }
    return Math.round(value * 2) / 2;
  };

  const handleCanvasClick = (point: { x: number; z: number }) => {
    if (selectedTool === 'wall' && isDrawing && drawingStart) {
      const snappedStart = {
        x: snapToGridValue(drawingStart.x),
        z: snapToGridValue(drawingStart.z),
      };
      const snappedEnd = {
        x: snapToGridValue(point.x),
        z: snapToGridValue(point.z),
      };
      if (
        Math.abs(snappedStart.x - snappedEnd.x) < 0.1 &&
        Math.abs(snappedStart.z - snappedEnd.z) < 0.1
      ) {
        return;
      }
      const newWall = {
        id: `wall-${Date.now()}`,
        start: { x: snappedStart.x, y: 0, z: snappedStart.z },
        end: { x: snappedEnd.x, y: 0, z: snappedEnd.z },
        height: wallHeight,
        thickness: wallThickness,
        color: wallColor,
      };
      dispatch(addWall(newWall));
    }
  };

  const handleWallSelect = (wallId: string | null) => {
    dispatch(setSelectedWallId(wallId));
  };

  const handleObjectSelect = (objectId: string | null) => {
    dispatch(setSelectedObjectId(objectId));
  };

  const handleObjectMove = (objectId: string, newPosition: THREE.Vector3) => {
    dispatch(
      updateObject({
        id: objectId,
        updates: {
          position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
        },
      }),
    );
  };

  // HUD Component
  const HUD = () => {
    if (!hudEnabled || viewMode === '2d') {
      return null;
    }
    return (
      <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white p-4 rounded-lg text-sm space-y-2 min-w-[200px]">
        <div className="font-semibold">Room Information</div>
        <div>
          Size: {currentRoomSize.name} ({currentRoomSize.width}x{currentRoomSize.length}m)
        </div>
        <div>View: {viewMode.toUpperCase()}</div>
        <div>Tool: {selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)}</div>
        <div>Walls: {walls.length}</div>
        <div>Objects: {objects.length}</div>
        {selectedWallId && <div className="text-green-400">Wall Selected</div>}
        {selectedObjectId && <div className="text-blue-400">Object Selected</div>}
        {firstPersonMode && <div className="text-yellow-400">First Person Mode</div>}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header Toolbar */}
      <HeaderToolbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Model Sidebar */}
        <ModelSidebar />
        {/* Main 3D Canvas Area */}
        <div className="flex-1 relative bg-gray-200 dark:bg-gray-700">
          <ThreeCanvas
            walls={walls}
            objects={objects}
            doors={doors}
            windows={windows}
            gridEnabled={gridEnabled}
            isDarkMode={theme === 'dark'}
            selectedWallId={selectedWallId}
            selectedObjectId={selectedObjectId}
            selectedDoorId={selectedDoorId}
            selectedWindowId={selectedWindowId}
            onWallSelect={handleWallSelect}
            onObjectSelect={handleObjectSelect}
            onObjectMove={handleObjectMove}
            onCanvasClick={handleCanvasClick}
            drawingStart={drawingStart}
            isDrawing={isDrawing}
            selectedTool={selectedTool}
            viewMode={viewMode}
            firstPersonMode={firstPersonMode}
            hudEnabled={hudEnabled}
            selectedColor={selectedColor}
            floorColor={floorColor}
            roomSize={currentRoomSize}
          />
          {/* HUD Overlay */}
          <HUD />
          {/* Controls Help */}
          <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg text-xs md:text-sm max-w-xs">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
              Controls:
            </h3>
            <div className="space-y-1 text-gray-600 dark:text-gray-300">
              <p>
                <strong>3D View:</strong>
              </p>
              <p>• Orbit: Left-Click & Drag</p>
              <p>• Zoom: Scroll Wheel</p>
              <p>• Pan: Right-Click & Drag</p>
              <p className="mt-2">
                <strong>Tools:</strong>
              </p>
              <p>• Select: Click objects/walls</p>
              <p>• Wall: Click to draw walls</p>
              <p>• Drag: Move objects in 3D</p>
              <p>• Paint: Color walls/objects</p>
              <p>• Delete: Remove selected items</p>
              <p>• Resize: Scale objects</p>
              <p className="mt-2">
                <strong>Shortcuts:</strong>
              </p>
              <p>• Esc: Cancel/Deselect</p>
              <p>• Del: Delete selected</p>
              <p>• Ctrl+Z: Undo</p>
              <p>• Ctrl+Shift+Z: Redo</p>
            </div>
          </div>
          {/* Empty State */}
          {walls.length === 0 && objects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-8 shadow-lg text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  Start Building Your Dream Room
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Choose a room size, select tools from the toolbar, and add furniture
                  from the sidebar to create your perfect space.
                </p>
                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>1. Set your room size in the toolbar</p>
                  <p>2. Use the Wall tool to draw room boundaries</p>
                  <p>3. Add furniture and decorations from the sidebar</p>
                  <p>4. Use the Paint tool to customize colors</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Color Palette Modal */}
      <ColorPalette />
    </div>
  );
}
