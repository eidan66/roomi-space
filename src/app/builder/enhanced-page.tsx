'use client';

import React, { useCallback, useState } from 'react';

import {
  Building,
  FolderOpen,
  Move,
  Move3d,
  Paintbrush2,
  PencilRuler,
  Plus,
  Save,
  Settings,
  Square,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '@/components/AuthProvider';
import ColorPalette from '@/components/ColorPalette';
import DesignGallery from '@/components/DesignGallery';
import EnhancedFloorplan2DCanvas from '@/components/EnhancedFloorplan2DCanvas';
import EnhancedThreeCanvas from '@/components/EnhancedThreeCanvas';
import ModelCategories from '@/components/ModelCategories';
import SaveDesignModal from '@/components/SaveDesignModal';
import TopToolbar from '@/components/TopToolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_COLORS } from '@/config/colorPalette';
import {
  clearAllRooms,
  deleteRoom,
  setDefaultWallThickness,
  setEditMode,
  setViewMode,
  setWallHeight,
  startNewRoom,
  toggleGrid,
  toggleMeasurements,
  toggleSnapToGrid,
  toggleWindows,
} from '@/features/roomSlice';
import { RootState } from '@/features/store';
import { SavedDesign } from '@/lib/designService';

export default function EnhancedRoomBuilderPage() {
  const { t: _t } = useTranslation();
  const { user: _user } = useAuth();
  const { theme } = useTheme();
  const dispatch = useDispatch();

  // Redux state
  const {
    rooms,
    activeRoomId,
    drawingPoints: _drawingPoints,
    isDrawing,
    viewMode,
    editMode,
    showMeasurements,
    showWindows,
    gridEnabled,
    snapToGrid,
    wallHeight,
    defaultWallThickness,
  } = useSelector((state: RootState) => state.room);

  // Local state
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showObjectsModal, setShowObjectsModal] = useState(false);
  const [_showSettingsModal, _setShowSettingsModal] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [_autoSaveEnabled, _setAutoSaveEnabled] = useState(false);
  const [_roomName, setRoomName] = useState('Enhanced Room Design');
  const [_activeTool, _setActiveTool] = useState<
    'select' | 'drag' | 'paint' | 'delete' | 'resize'
  >('select');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [floorType, setFloorType] = useState<
    'wood' | 'tile' | 'concrete' | 'marble' | 'carpet'
  >('wood');
  const [wallMaterial, setWallMaterial] = useState<
    'paint' | 'brick' | 'stone' | 'wood' | 'metal'
  >('paint');

  // Handle edit mode changes
  const handleEditModeChange = (mode: 'draw' | 'move' | 'idle' | 'delete') => {
    dispatch(setEditMode(mode));
    if (mode === 'draw' && !isDrawing && !activeRoomId) {
      dispatch(startNewRoom());
    }
  };

  // Handle view mode toggle
  const toggleViewMode = () => {
    dispatch(setViewMode(viewMode === '2d' ? '3d' : '2d'));
  };

  // Handle screenshot
  const handleScreenshot = useCallback((url: string) => {
    setScreenshotUrl(url);
    setShowScreenshotModal(true);
  }, []);

  // Room management
  const handleNewRoom = () => {
    dispatch(startNewRoom());
    dispatch(setEditMode('draw'));
  };

  const handleDeleteRoom = (roomId: string) => {
    dispatch(deleteRoom(roomId));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all rooms? This cannot be undone.')) {
      dispatch(clearAllRooms());
    }
  };

  // Settings handlers
  const handleWallHeightChange = (value: number[]) => {
    dispatch(setWallHeight(value[0]));
  };

  const handleWallThicknessChange = (value: number[]) => {
    dispatch(setDefaultWallThickness(value[0]));
  };

  const isDarkMode = theme === 'dark';
  const completedRooms = rooms.filter((room) => room.isCompleted);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Top Toolbar */}
      <TopToolbar
        roomSize="m"
        setRoomSize={() => {}}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTool="select"
        setActiveTool={() => {}}
        onScreenshot={() => {}}
        onSave={() => setShowSaveModal(true)}
        _selectedColor={selectedColor}
        _setSelectedColor={setSelectedColor}
      />

      {/* Main Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/images/roomi-logo-light.jpeg"
                alt="Roomi"
                width={32}
                height={32}
                className="rounded"
              />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enhanced Room Builder
              </h1>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {completedRooms.length} room{completedRooms.length !== 1 ? 's' : ''}{' '}
                created
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Edit Mode Buttons */}
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={editMode === 'draw' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleEditModeChange('draw')}
                  className="flex items-center space-x-1"
                >
                  <PencilRuler className="w-4 h-4" />
                  <span>Draw</span>
                </Button>
                <Button
                  variant={editMode === 'move' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleEditModeChange('move')}
                  className="flex items-center space-x-1"
                >
                  <Move className="w-4 h-4" />
                  <span>Move</span>
                </Button>
                <Button
                  variant={editMode === 'delete' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleEditModeChange('delete')}
                  className="flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              </div>

              {/* View Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleViewMode}
                className="flex items-center space-x-1"
              >
                {viewMode === '2d' ? (
                  <Move3d className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>{viewMode === '2d' ? '3D' : '2D'}</span>
              </Button>

              {/* Actions */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGallery(true)}
                className="flex items-center space-x-1"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Gallery</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveModal(true)}
                className="flex items-center space-x-1"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Room Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Room Controls</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Button
                    onClick={handleNewRoom}
                    className="flex-1 flex items-center space-x-1"
                    disabled={isDrawing}
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Room</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearAll}
                    className="flex items-center space-x-1"
                    disabled={rooms.length === 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Room List */}
                {rooms.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rooms ({rooms.length})</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {rooms.map((room) => (
                        <div
                          key={room.id}
                          className={`flex items-center justify-between p-2 rounded border ${
                            room.isActive
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">{room.name}</div>
                            <div className="text-xs text-gray-500">
                              {room.walls.length} walls •{' '}
                              {room.isCompleted ? 'Complete' : 'Drawing'}
                            </div>
                          </div>
                          {room.isCompleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRoom(room.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Wall Height */}
                <div className="space-y-2">
                  <Label className="text-sm">Wall Height: {wallHeight.toFixed(1)}m</Label>
                  <Slider
                    value={[wallHeight]}
                    onValueChange={handleWallHeightChange}
                    min={2.0}
                    max={4.0}
                    step={0.1}
                  />
                </div>

                {/* Default Wall Thickness */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Default Thickness: {(defaultWallThickness * 100).toFixed(0)}cm
                  </Label>
                  <Slider
                    value={[defaultWallThickness]}
                    onValueChange={handleWallThicknessChange}
                    min={0.1}
                    max={0.5}
                    step={0.05}
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Grid</Label>
                    <Switch
                      checked={gridEnabled}
                      onCheckedChange={() => dispatch(toggleGrid())}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Snap to Grid</Label>
                    <Switch
                      checked={snapToGrid}
                      onCheckedChange={() => dispatch(toggleSnapToGrid())}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Measurements</Label>
                    <Switch
                      checked={showMeasurements}
                      onCheckedChange={() => dispatch(toggleMeasurements())}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Windows</Label>
                    <Switch
                      checked={showWindows}
                      onCheckedChange={() => dispatch(toggleWindows())}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Paintbrush2 className="w-5 h-5" />
                  <span>Materials</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Floor Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['wood', 'tile', 'concrete', 'marble', 'carpet'].map((type) => (
                      <Button
                        key={type}
                        variant={floorType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFloorType(type as any)}
                        className="capitalize"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Wall Material</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['paint', 'brick', 'stone', 'wood', 'metal'].map((material) => (
                      <Button
                        key={material}
                        variant={wallMaterial === material ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setWallMaterial(material as any)}
                        className="capitalize"
                      >
                        {material}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Palette */}
            <ColorPalette
              colors={DEFAULT_COLORS}
              selected={selectedColor}
              onSelect={setSelectedColor}
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          <div className="flex-1 p-4">
            {viewMode === '2d' ? (
              <EnhancedFloorplan2DCanvas
                width={800}
                height={600}
                className="mx-auto rounded-lg shadow-lg bg-white"
              />
            ) : (
              <EnhancedThreeCanvas
                width={800}
                height={600}
                className="mx-auto rounded-lg shadow-lg"
                isDarkMode={isDarkMode}
                floorType={floorType}
                wallMaterial={wallMaterial}
                showWindows={showWindows}
                onScreenshot={handleScreenshot}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSaveModal && (
        <SaveDesignModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={(designId: string) => {
            setCurrentDesignId(designId);
            setShowSaveModal(false);
          }}
          walls={[]}
          objects={[]}
          existingDesignId={currentDesignId || undefined}
        />
      )}

      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Design Gallery</h2>
              <Button variant="outline" onClick={() => setShowGallery(false)}>
                Close
              </Button>
            </div>
            <DesignGallery
              onLoadDesign={(design: SavedDesign) => {
                // Handle loading design
                setCurrentDesignId(design.id || null);
                setRoomName(design.name);
                setShowGallery(false);
              }}
              onEditDesign={(designId: string) => {
                setCurrentDesignId(designId);
                setShowGallery(false);
              }}
            />
          </div>
        </div>
      )}

      {showObjectsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Objects</h2>
              <Button variant="outline" onClick={() => setShowObjectsModal(false)}>
                Close
              </Button>
            </div>
            <ModelCategories
              onAdd={(_type: string) => {
                // Handle object selection
                setShowObjectsModal(false);
              }}
              onShowMore={() => {
                // Handle show more
              }}
            />
          </div>
        </div>
      )}

      {showScreenshotModal && screenshotUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">Screenshot</h3>
            <img src={screenshotUrl} alt="Screenshot" className="max-w-full rounded" />
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowScreenshotModal(false)}>
                Close
              </Button>
              <Button asChild>
                <a href={screenshotUrl} download="room-design.png">
                  Download
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
