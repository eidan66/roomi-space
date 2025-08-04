'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  Building,
  FolderOpen,
  Move,
  Move3d,
  Paintbrush2,
  PencilRuler,
  Save,
  Square,
  View,
} from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import { RoomGeometry, useAdvancedRoom } from '@/components/AdvancedRoomBuilder';
import { useAuth } from '@/components/AuthProvider';
import ColorPalette from '@/components/ColorPalette';
import DesignGallery from '@/components/DesignGallery';
import Floorplan2DCanvas, { Wall } from '@/components/Floorplan2DCanvas';
import ModelCategories from '@/components/ModelCategories';
import SaveDesignModal from '@/components/SaveDesignModal';
import ThreeCanvas from '@/components/ThreeCanvas';
import TopToolbar from '@/components/TopToolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_COLORS } from '@/config/colorPalette';
import { SavedDesign } from '@/lib/designService';

// Room templates are now generated dynamically using the advanced room builder

export default function RoomBuilderPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { walls, setWalls } = useAdvancedRoom([]);
  const [_objects, _setObjects] = useState<THREE.Object3D[]>([]);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [editMode, setEditMode] = useState<'draw' | 'move' | 'delete' | 'idle'>('draw');
  const [_showGrid, _setShowGrid] = useState(true);
  const [gridSnapping, setGridSnapping] = useState(true);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showObjectsModal, setShowObjectsModal] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [_notifications, _setNotifications] = useState<
    Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>
  >([]);
  const [roomName, setRoomName] = useState('Untitled Room');
  const [roomSize, setRoomSize] = useState<'xs' | 's' | 'm' | 'l' | 'xl'>('m');
  const [activeTool, setActiveTool] = useState<
    'select' | 'drag' | 'paint' | 'delete' | 'resize'
  >('select');
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [wallHeight] = useState(2.8);
  const [wallThickness] = useState(0.25);
  const [showWindows] = useState(true);
  const [gridEnabled, _setGridEnabled] = useState(true);
  const threeApiRef = useRef<{
    addObject: (type: string, position?: { x: number; z: number }) => void;
    getObjects: () => THREE.Object3D[];
  } | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const canvas2DRef = useRef<HTMLDivElement>(null);
  const canvas3DRef = useRef<HTMLDivElement>(null);

  const [_undoStack, setUndoStack] = useState<Wall[][]>([]);
  const [_redoStack, setRedoStack] = useState<Wall[][]>([]);
  const { theme } = useTheme();

  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
  ) => {
    setNotification({
      message,
      type,
      visible: true,
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  const _recordUndo = useCallback(() => {
    setUndoStack((prev) => [...prev, walls]);
    setRedoStack([]);
  }, [walls]);

  const handleWallsChange = useCallback(() => {
    // Auto-optimize wall graph whenever walls change
    setWalls((prev) => RoomGeometry.optimizeWalls(prev));
  }, [setWalls]);

  // Load saved room from localStorage on initial render
  useEffect(() => {
    const savedRoomJson = localStorage.getItem('savedRoom');
    if (savedRoomJson) {
      try {
        const savedRoom = JSON.parse(savedRoomJson);
        setWalls(savedRoom.walls);
        setRoomName(savedRoom.name);
        showNotification(t('notifications.loadedPreviousRoom'), 'info');
      } catch (error) {
        console.error('Failed to load saved room:', error);
      }
    }
  }, [setWalls, t]);

  // Handle design loading
  const handleLoadDesign = useCallback(
    (design: SavedDesign) => {
      // Convert 2D coordinates (x,y) back to 3D coordinates (x,z)
      const wallsWithZ = design.walls.map((wall) => ({
        ...wall,
        start: { x: wall.start.x, z: wall.start.y }, // Map y back to z
        end: { x: wall.end.x, z: wall.end.y }, // Map y back to z
      }));
      setWalls(wallsWithZ);
      setRoomName(design.name);
      setCurrentDesignId(design.id || null);
      setShowGallery(false);
      showNotification(`Loaded design: ${design.name}`, 'success');
    },
    [setWalls],
  );

  const handleEditDesign = useCallback((designId: string) => {
    setCurrentDesignId(designId);
    setShowGallery(false);
    showNotification('Editing existing design', 'info');
  }, []);

  const handleSaveDesign = useCallback(
    (designId: string) => {
      console.log('🔧 SaveDesign called with ID:', designId);
      setCurrentDesignId(designId);
      if (autoSaveEnabled) {
        setAutoSaveEnabled(true);
      }
      showNotification('Design saved successfully', 'success');
    },
    [autoSaveEnabled],
  );

  // Debug: Check user auth status
  useEffect(() => {
    console.log('🔧 Builder page - User auth status:', !!user);
  }, [user]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopToolbar
        isPremium={false}
        roomSize={roomSize}
        setRoomSize={setRoomSize}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        _selectedColor={selectedColor}
        _setSelectedColor={setSelectedColor}
        onScreenshot={(url) => {
          if (url) {
            setScreenshotUrl(url);
            setShowScreenshotModal(true);
          }
          showNotification(t('notifications.screenshotCaptured'), 'success');
        }}
        onSave={() => setShowSaveModal(true)}
        onPremiumRedirect={() => (window.location.href = '/premium')}
        canvasRef={canvas2DRef}
        threeCanvasRef={canvas3DRef}
        threeRendererRef={threeRendererRef}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* --- Sidebar --- */}
        <div className="w-full md:w-72 lg:w-80 bg-card border-r border-border overflow-y-auto p-2 lg:p-4 space-y-2 lg:space-y-4 max-h-96 lg:max-h-none">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white/90">
              <Image
                src="/images/roomi-logo-light.jpeg"
                alt={t('alt.logo')}
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('builder.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('builder.tagline')}</p>
            </div>
          </div>

          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('room.placeholder')}
          />

          {/* Design Management */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="text-base lg:text-lg flex items-center">
                <FolderOpen className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                Design Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGallery(!showGallery)}
                  className="flex-1"
                >
                  <FolderOpen className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                  Gallery
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveModal(true)}
                  className="flex-1"
                >
                  <Save className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                  Save
                </Button>
              </div>
              {currentDesignId && (
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={autoSaveEnabled}
                    onCheckedChange={setAutoSaveEnabled}
                  />
                  <Label className="text-xs">Auto-save</Label>
                </div>
              )}
            </CardContent>
          </Card>

          {showGallery && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-2">
                <DesignGallery
                  onLoadDesign={handleLoadDesign}
                  onEditDesign={handleEditDesign}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="text-base lg:text-lg flex items-center">
                <View className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                {t('sidebar.viewMode')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button
                  variant={viewMode === '2d' ? 'default' : 'outline'}
                  onClick={() => setViewMode('2d')}
                  className="flex-1 text-xs lg:text-sm"
                  size="sm"
                >
                  <PencilRuler className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                  {t('sidebar.plan2d')}
                </Button>
                <Button
                  variant={viewMode === '3d' ? 'default' : 'outline'}
                  onClick={() => setViewMode('3d')}
                  className="flex-1 text-xs lg:text-sm"
                  size="sm"
                >
                  <Move3d className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                  {t('sidebar.view3d')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {viewMode === '2d' && (
            <>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 lg:pb-3">
                  <CardTitle className="text-base lg:text-lg flex items-center">
                    <Square className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                    {t('sidebar.drawingTools')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 lg:space-y-3">
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-0 lg:space-y-2">
                    <Button
                      variant={editMode === 'draw' ? 'secondary' : 'outline'}
                      onClick={() => setEditMode('draw')}
                      className="justify-start text-xs lg:text-sm"
                      size="sm"
                    >
                      <Building className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                      <span className="hidden sm:inline">{t('sidebar.drawWalls')}</span>
                      <span className="sm:hidden">Draw</span>
                    </Button>
                    <Button
                      variant={editMode === 'move' ? 'secondary' : 'outline'}
                      onClick={() => setEditMode('move')}
                      className="justify-start text-xs lg:text-sm"
                      size="sm"
                    >
                      <Move className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                      <span className="hidden sm:inline">{t('sidebar.movePoints')}</span>
                      <span className="sm:hidden">Move</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs lg:text-sm">
                        {t('sidebar.showGrid')}
                      </Label>
                      <Switch checked={gridSnapping} onCheckedChange={setGridSnapping} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Room Metrics */}
              {/* Removed RoomMetrics import and usage */}
            </>
          )}

          {/* Color Picker (3D mode only) */}
          {viewMode === '3d' && activeTool === 'paint' && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 lg:pb-3">
                <CardTitle className="text-base lg:text-lg flex items-center">
                  <Paintbrush2 className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                  Color Picker
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ColorPalette
                  colors={DEFAULT_COLORS}
                  selected={selectedColor}
                  onSelect={setSelectedColor}
                />
              </CardContent>
            </Card>
          )}

          <div>
            <ModelCategories
              onAdd={(cat) => {
                const map: Record<string, string> = {
                  furniture: 'chair',
                  carpets: 'carpet',
                  lamps: 'lamp',
                  appliances: 'fridge',
                  'decorative items': 'plant',
                  walls: 'paint',
                  floors: 'floor',
                  textile: 'sofa',
                };
                const type = map[cat] ?? cat;
                console.log('Adding object:', cat, 'mapped to', type);
                if (viewMode === '3d' && threeApiRef.current) {
                  threeApiRef.current.addObject(type);
                } else {
                  showNotification('Switch to 3D mode to add objects', 'info');
                }
              }}
              onShowMore={() => setShowObjectsModal(true)}
            />
          </div>
        </div>

        {/* --- Main Canvas Area --- */}
        <div className="flex-1 relative bg-muted">
          {viewMode === '2d' ? (
            <div
              ref={canvas2DRef}
              className="w-full h-full md:scale-90 md:origin-top-left"
            >
              <Floorplan2DCanvas
                walls={walls}
                setWalls={setWalls}
                mode={editMode}
                setMode={setEditMode}
                wallHeight={wallHeight}
                wallThickness={wallThickness}
                onWallsChange={handleWallsChange}
                gridSnapping={gridSnapping}
              />
            </div>
          ) : (
            <div ref={canvas3DRef} className="w-full h-full">
              <ThreeCanvas
                apiRef={threeApiRef}
                walls={walls}
                gridEnabled={gridEnabled && editMode !== 'idle'}
                isDarkMode={theme === 'dark'}
                showWindows={showWindows}
                rendererRef={threeRendererRef}
                activeTool={activeTool}
                selectedColor={selectedColor}
                onScreenshot={() => {
                  // This will be called when screenshot is taken from ThreeCanvas
                  console.log('Screenshot taken from ThreeCanvas');
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Design Modal */}
      <SaveDesignModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveDesign}
        walls={walls}
        objects={threeApiRef.current?.getObjects() || []}
        autoSave={autoSaveEnabled}
        existingDesignId={currentDesignId || undefined}
      />

      {/* Notification Toast */}
      {notification.visible && (
        <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${(() => {
                if (notification.type === 'success') {
                  return 'bg-green-500';
                }
                if (notification.type === 'error') {
                  return 'bg-red-500';
                }
                return 'bg-blue-500';
              })()}`}
            />
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Objects Modal */}
      {showObjectsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Add Object</h2>
            <div className="grid grid-cols-2 gap-2">
              {['chair', 'table', 'sofa', 'plant', 'lamp'].map((obj) => (
                <Button
                  key={obj}
                  variant="default"
                  onClick={() => {
                    console.log('Modal adding object:', obj);
                    if (viewMode === '3d' && threeApiRef.current) {
                      threeApiRef.current.addObject(obj);
                      setShowObjectsModal(false);
                    } else {
                      showNotification('Switch to 3D mode to add objects', 'info');
                      setShowObjectsModal(false);
                    }
                  }}
                >
                  {obj.charAt(0).toUpperCase() + obj.slice(1)}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowObjectsModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t('toolbar.screenshot')}
            </h2>
            {screenshotUrl && (
              <Image
                src={screenshotUrl}
                alt="screenshot"
                width={400}
                height={300}
                className="w-full border border-border rounded"
              />
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  // Save to profile rooms in localStorage
                  const rooms = JSON.parse(localStorage.getItem('profileRooms') || '[]');
                  rooms.push({
                    id: Date.now(),
                    name: roomName,
                    screenshot: screenshotUrl,
                    timestamp: new Date().toISOString(),
                  });
                  localStorage.setItem('profileRooms', JSON.stringify(rooms));
                  setShowScreenshotModal(false);
                  showNotification('Screenshot saved to profile', 'success');
                }}
              >
                Save to Profile
              </Button>
              <Button variant="outline" onClick={() => setShowScreenshotModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
