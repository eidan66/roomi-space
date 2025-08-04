'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Building,
  Move,
  Move3d,
  Paintbrush2,
  PencilRuler,
  Square,
  View,
} from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import { useAdvancedRoom } from '@/components/AdvancedRoomBuilder';
import ColorPalette from '@/components/ColorPalette';
import Floorplan2DCanvas, { Wall } from '@/components/Floorplan2DCanvas';
import ModelCategories from '@/components/ModelCategories';
import RoomMetrics from '@/components/RoomMetrics';
import ThreeCanvas from '@/components/ThreeCanvas';
import TopToolbar from '@/components/TopToolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_COLORS } from '@/config/colorPalette';
import { ROOM_SIZES } from '@/config/roomSizes';
import { AdvancedRoomCalculator } from '@/lib/advanced-room-calculator';

// Room templates are now generated dynamically using the advanced room builder

export default function RoomBuilderPage() {
  const { t } = useTranslation();
  const { walls, setWalls, clearWalls, generateRectangularRoom } = useAdvancedRoom([]);

  // Calculate advanced metrics using the new calculator
  const _roomMetrics = useMemo(
    () => AdvancedRoomCalculator.calculateRoomMetrics(walls),
    [walls],
  );

  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [editMode, setEditMode] = useState<'draw' | 'move' | 'delete' | 'idle'>('idle');

  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSnapping, setGridSnapping] = useState(true);
  const [wallHeight] = useState(2.8);
  const [wallThickness] = useState(0.25);
  const [showWindows] = useState(true);

  // Top toolbar states
  const [roomSize, setRoomSize] = useState<'xs' | 's' | 'm' | 'l' | 'xl'>('m');
  const [activeTool, setActiveTool] = useState<
    'select' | 'drag' | 'paint' | 'delete' | 'resize'
  >('select');
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff');

  // Sync delete tool with editMode when in 2D view
  useEffect(() => {
    if (viewMode === '2d') {
      if (activeTool === 'delete') {
        setEditMode('delete');
      } else if (activeTool === 'drag') {
        setEditMode('move');
      } else if (activeTool === 'select') {
        setEditMode('idle');
      }
    }
  }, [activeTool, viewMode]);

  // Apply room size template when roomSize changes
  useEffect(() => {
    const size = ROOM_SIZES.find((s) => s.key === roomSize);
    if (!size) {
      return;
    }
    // Clear existing and generate new room
    if (walls.length > 0) {
      recordUndo();
    }
    clearWalls();
    generateRectangularRoom(size.width, size.length, wallHeight, wallThickness);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSize]);

  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [showObjectsModal, setShowObjectsModal] = useState(false);

  const threeApiRef = useRef<{
    addObject: (type: string, position?: { x: number; z: number }) => void;
  } | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');

  // Canvas refs for screenshot
  const canvas2DRef = useRef<HTMLDivElement>(null);
  const canvas3DRef = useRef<HTMLDivElement>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer>(null);

  const [_undoStack, setUndoStack] = useState<Wall[][]>([]);
  const [_redoStack, setRedoStack] = useState<Wall[][]>([]);
  const [roomName, setRoomName] = useState('My Dream Room');
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

  const recordUndo = useCallback(() => {
    setUndoStack((prev) => [...prev, walls]);
    setRedoStack([]);
  }, [walls]);

  const handleWallsChange = useCallback(() => {
    // Room validation and area calculation is now handled by useAdvancedRoom hook
    // Both 2D and 3D views use the same wall state for perfect synchronization
  }, []);

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
        onPremiumRedirect={() => (window.location.href = '/premium')}
        canvasRef={canvas2DRef}
        threeCanvasRef={canvas3DRef}
        threeRendererRef={threeRendererRef}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* --- Sidebar --- */}
        <div className="w-full lg:w-80 bg-card border-r border-border overflow-y-auto p-2 lg:p-4 space-y-2 lg:space-y-4 max-h-96 lg:max-h-none">
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
                      <Switch checked={gridEnabled} onCheckedChange={setGridEnabled} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs lg:text-sm">
                        {t('sidebar.gridSnapping')}
                      </Label>
                      <Switch checked={gridSnapping} onCheckedChange={setGridSnapping} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Room Metrics */}
              <RoomMetrics metrics={_roomMetrics} />
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
            <div ref={canvas2DRef} className="w-full h-full">
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
      {/* Notification Toast */}
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
                    walls,
                    screenshot: screenshotUrl,
                    createdAt: new Date().toISOString(),
                  });
                  localStorage.setItem('profileRooms', JSON.stringify(rooms));
                  showNotification(t('notifications.roomSaved'), 'success');
                  setShowScreenshotModal(false);
                }}
              >
                {t('sidebar.saveRoom')}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowScreenshotModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {notification.visible && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg text-white transition-opacity duration-300 ${(() => {
            switch (notification.type) {
              case 'success':
                return 'bg-green-500';
              case 'error':
                return 'bg-red-500';
              default:
                return 'bg-blue-500';
            }
          })()}`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}
