'use client';

import React from 'react';
import {
  Building,
  MousePointer,
  Move3d,
  Palette,
  Trash2,
  Maximize,
  Camera,
  Eye,
  EyeOff,
  Lock,
  Settings,
  Download,
  Undo,
  Redo,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/features/store';
import {
  setSelectedTool,
  setViewMode,
  setRoomSize,
  setIsPremiumMode,
  setFirstPersonMode,
  setHudEnabled,
  undo,
  redo,
  clearAll,
} from '@/features/roomSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROOM_SIZES, RoomSizeKey } from '@/config/roomSizes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const HeaderToolbar = () => {
  const dispatch = useDispatch();
  const {
    selectedTool,
    viewMode,
    roomSize,
    isPremiumMode,
    firstPersonMode,
    hudEnabled,
    undoStack,
    redoStack,
    walls,
    objects,
  } = useSelector((state: RootState) => state.room);

  const toolsConfig = [
    {
      id: 'select',
      icon: MousePointer,
      label: 'Select',
      description: 'Select walls and objects',
    },
    {
      id: 'wall',
      icon: Building,
      label: 'Wall',
      description: 'Draw walls',
    },
    {
      id: 'drag',
      icon: Move3d,
      label: 'Drag',
      description: 'Move objects along X/Y/Z axes',
    },
    {
      id: 'paint',
      icon: Palette,
      label: 'Paint',
      description: 'Color walls, floors, and furniture',
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      description: 'Remove selected objects',
    },
    {
      id: 'resize',
      icon: Maximize,
      label: 'Resize',
      description: 'Resize furniture items',
    },
  ];

  const handleToolSelect = (toolId: string) => {
    dispatch(setSelectedTool(toolId as any));
  };

  const handleViewModeToggle = () => {
    dispatch(setViewMode(viewMode === '3d' ? '2d' : '3d'));
  };

  const handleRoomSizeChange = (size: RoomSizeKey) => {
    dispatch(setRoomSize(size));
  };

  const handlePremiumModeToggle = () => {
    if (!isPremiumMode) {
      // Redirect to premium package purchase
      alert('Premium mode required! Redirecting to premium package...');
      // Here you would typically navigate to premium purchase page
      return;
    }
    dispatch(setIsPremiumMode(!isPremiumMode));
  };

  const handleScreenshot = () => {
    // This will be implemented in the 3D canvas component
    console.log('Taking screenshot...');
  };

  const handleSaveRoom = () => {
    const roomData = {
      walls,
      objects,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('dreamRoom', JSON.stringify(roomData));
    alert('Room saved successfully!');
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Room Size and Premium Mode */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Room Size:
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {ROOM_SIZES[roomSize].name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(ROOM_SIZES).map(([key, config]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleRoomSizeChange(key as RoomSizeKey)}
                  >
                    <span className="font-medium">{config.name}</span>
                    <span className="ml-2 text-gray-500">
                      ({config.width}x{config.length}m)
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={isPremiumMode ? 'default' : 'outline'}
              size="sm"
              onClick={handlePremiumModeToggle}
              className="flex items-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>Room Drawing Mode</span>
              {!isPremiumMode && (
                <Badge variant="secondary" className="ml-1">
                  Premium
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Center Section - Main Tools */}
        <div className="flex items-center space-x-2">
          {toolsConfig.map((tool) => (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToolSelect(tool.id)}
              title={tool.description}
              className="flex items-center space-x-1"
            >
              <tool.icon className="w-4 h-4" />
              <span className="hidden md:inline">{tool.label}</span>
            </Button>
          ))}
        </div>

        {/* Right Section - Camera Tools and Actions */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewModeToggle}
            title={`Switch to ${viewMode === '3d' ? '2D' : '3D'} view`}
          >
            <Eye className="w-4 h-4" />
            <span className="ml-1">{viewMode.toUpperCase()}</span>
          </Button>

          {/* First Person Mode */}
          <Button
            variant={firstPersonMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => dispatch(setFirstPersonMode(!firstPersonMode))}
            title="First Person Navigation"
          >
            <Camera className="w-4 h-4" />
          </Button>

          {/* HUD Toggle */}
          <Button
            variant={hudEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => dispatch(setHudEnabled(!hudEnabled))}
            title="Toggle HUD"
          >
            {hudEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          {/* Undo/Redo */}
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(undo())}
              disabled={undoStack.length === 0}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch(redo())}
              disabled={redoStack.length === 0}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>

          {/* Screenshot */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleScreenshot}
            title="Take Screenshot"
          >
            <Download className="w-4 h-4" />
          </Button>

          {/* Clear All */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(clearAll())}
            title="Clear All"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* Save Room */}
          <Button
            onClick={handleSaveRoom}
            size="sm"
            disabled={walls.length === 0}
            title="Save Room"
          >
            <Save className="w-4 h-4" />
            <span className="ml-1 hidden md:inline">Save</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeaderToolbar;
