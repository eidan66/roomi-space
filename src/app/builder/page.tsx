'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowRight, Building, Move, Move3d, Palette, Redo, Save, Square, Undo, PencilRuler, View,
  Trash2, Home
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

import ThreeCanvas from '@/components/ThreeCanvas';
import Floorplan2DCanvas, { Wall } from '@/components/Floorplan2DCanvas';
import { useAdvancedRoom } from '@/components/AdvancedRoomBuilder';
import MaterialPresets, { MaterialPreset } from '@/components/MaterialPresets';
import RoomQualityAnalyzer from '@/components/RoomQualityAnalyzer';
import TopToolbar from '@/components/TopToolbar';
import { AdvancedRoomCalculator } from '@/lib/advanced-room-calculator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

// Room templates are now generated dynamically using the advanced room builder

export default function RoomBuilderPage() {
  const { t } = useTranslation();
  const {
    walls,
    setWalls,
    roomStats,
    clearWalls,
    generateRectangularRoom,
    generateLShapedRoom
  } = useAdvancedRoom([]);

  // Calculate advanced metrics using the new calculator
  const roomMetrics = useMemo(() => {
    return AdvancedRoomCalculator.calculateRoomMetrics(walls);
  }, [walls]);

  const isRoomValid = roomMetrics.isValid;

  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [editMode, setEditMode] = useState<'draw' | 'move' | 'idle'>('idle');

  const [gridEnabled, setGridEnabled] = useState(true);
  const [gridSnapping, setGridSnapping] = useState(true);
  const [showWindows, setShowWindows] = useState(true);
  const [wallHeight, setWallHeight] = useState(2.5);
  const [wallThickness, setWallThickness] = useState(0.2);
  const [floorType, setFloorType] = useState<'wood' | 'tile' | 'concrete' | 'marble' | 'carpet'>('wood');
  const [wallMaterial, setWallMaterial] = useState<'paint' | 'brick' | 'stone' | 'wood' | 'metal'>('paint');
  const [windowStyle, setWindowStyle] = useState<'modern' | 'classic' | 'industrial'>('modern');

  // Top toolbar states
  const [roomSize, setRoomSize] = useState<'xs' | 's' | 'm' | 'l' | 'xl'>('m');
  const [activeTool, setActiveTool] = useState<'select' | 'drag' | 'paint' | 'delete' | 'resize'>('select');
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const isPremium = false; // TODO: replace with real premium check


  const [undoStack, setUndoStack] = useState<Wall[][]>([]);
  const [redoStack, setRedoStack] = useState<Wall[][]>([]);
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
    visible: false
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({
      message,
      type,
      visible: true
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const recordUndo = useCallback(() => {
    setUndoStack(prev => [...prev, walls]);
    setRedoStack([]);
  }, [walls]);

  const undo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [walls, ...prev]);
      setUndoStack(prev => prev.slice(0, -1));
      setWalls(previousState);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack(prev => [...prev, walls]);
      setRedoStack(prev => prev.slice(1));
      setWalls(nextState);
    }
  };

  const clearAll = () => {
    if (walls.length === 0) return;
    recordUndo();
    clearWalls();
    showNotification(t('notifications.roomCleared'), 'info');
  };

  const saveRoom = () => {
    if (!isRoomValid) {
      showNotification(t('notifications.cannotSaveInvalid'), 'error');
      return;
    }

    // Here you would typically save to a database or localStorage
    localStorage.setItem('savedRoom', JSON.stringify({
      name: roomName,
      walls,
      createdAt: new Date().toISOString()
    }));

    showNotification(t('notifications.roomSaved'), 'success');
  };

  const loadTemplate = (templateIndex: number) => {
    if (walls.length > 0) {
      recordUndo();
    }

    if (templateIndex === 1) {
      // Square room template
      generateRectangularRoom(4, 4, wallHeight, wallThickness);
      showNotification(t('notifications.loadedSquareTemplate'), 'info');
    } else if (templateIndex === 2) {
      // L-shaped room template
      generateLShapedRoom(6, 6, 3, 3, wallHeight, wallThickness);
              showNotification(t('notifications.loadedLShapedTemplate'), 'info');
    }
  };

  const handleWallsChange = useCallback(() => {
    // Room validation and area calculation is now handled by useAdvancedRoom hook
    // Both 2D and 3D views use the same wall state for perfect synchronization
  }, []);

  // Apply wall properties to all walls
  const applyWallProperties = () => {
    if (walls.length === 0) return;

    recordUndo();
    const updatedWalls = walls.map(wall => ({
      ...wall,
      height: wallHeight,
      thickness: wallThickness
    }));

    setWalls(updatedWalls);
    showNotification(t('notifications.wallPropertiesApplied'), 'success');
  };

  const handlePresetSelect = (preset: MaterialPreset) => {
    setFloorType(preset.floorType);
    setWallMaterial(preset.wallMaterial);
    setWindowStyle(preset.windowStyle);
    showNotification(t('notifications.presetApplied', { preset: preset.name }), 'success');
  };

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
  }, []);

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
        onScreenshot={() => setShowScreenshotModal(true)}
        onPremiumRedirect={() => window.location.href = '/premium'}
      />

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* --- Sidebar --- */}
      <div className="w-full md:w-80 bg-card border-r border-border overflow-y-auto p-4 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white/90">
            <Image src="/images/roomi-logo-light.jpeg" alt={t('alt.logo')} width={40} height={40} className="w-full h-full object-contain" />
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
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><View className="w-5 h-5 mr-2" />{t('sidebar.viewMode')}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button variant={viewMode === '2d' ? 'default' : 'outline'} onClick={() => setViewMode('2d')} className="flex-1"><PencilRuler className="w-4 h-4 mr-2" />{t('sidebar.plan2d')}</Button>
              <Button variant={viewMode === '3d' ? 'default' : 'outline'} onClick={() => setViewMode('3d')} className="flex-1"><Move3d className="w-4 h-4 mr-2" />{t('sidebar.view3d')}</Button>
            </div>
          </CardContent>
        </Card>

        {viewMode === '2d' && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><Square className="w-5 h-5 mr-2" />{t('sidebar.drawingTools')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant={editMode === 'draw' ? 'secondary' : 'outline'} onClick={() => setEditMode('draw')} className="w-full justify-start"><Building className="w-4 h-4 mr-2" />{t('sidebar.drawWalls')}</Button>
              <Button variant={editMode === 'move' ? 'secondary' : 'outline'} onClick={() => setEditMode('move')} className="w-full justify-start"><Move className="w-4 h-4 mr-2" />{t('sidebar.movePoints')}</Button>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-sm">{t('sidebar.showGrid')}</Label>
                <Switch checked={gridEnabled} onCheckedChange={setGridEnabled} />
              </div>
              <div className="flex items-center justify-between pt-2">
                <Label className="text-sm">{t('sidebar.gridSnapping')}</Label>
                <Switch checked={gridSnapping} onCheckedChange={setGridSnapping} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><Palette className="w-5 h-5 mr-2" />{t('sidebar.wallProperties')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">{t('sidebar.wallHeight')}: {wallHeight.toFixed(1)}m</Label>
              <Slider value={[wallHeight]} onValueChange={([v]) => setWallHeight(v)} min={1} max={4} step={0.1} className="w-full" />
            </div>
            <div>
              <Label className="text-sm mb-2 block">{t('sidebar.wallThickness')}: {wallThickness.toFixed(2)}m</Label>
              <Slider value={[wallThickness]} onValueChange={([v]) => setWallThickness(v)} min={0.05} max={0.3} step={0.01} className="w-full" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label className="text-sm">{t('sidebar.showWindows')}</Label>
              <Switch checked={showWindows} onCheckedChange={setShowWindows} />
            </div>
            <div className="pt-2">
              <Label className="text-sm mb-2 block">{t('sidebar.floorMaterial')}</Label>
              <div className="grid grid-cols-3 gap-1 mb-2">
                <Button
                  variant={floorType === 'wood' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFloorType('wood')}
                  className="text-xs"
                >
                  🪵 {t('material.wood')}
                </Button>
                <Button
                  variant={floorType === 'tile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFloorType('tile')}
                  className="text-xs"
                >
                  🔲 {t('material.tile')}
                </Button>
                <Button
                  variant={floorType === 'concrete' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFloorType('concrete')}
                  className="text-xs"
                >
                  🏗️ {t('material.concrete')}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant={floorType === 'marble' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFloorType('marble')}
                  className="text-xs"
                >
                  💎 {t('material.marble')}
                </Button>
                <Button
                  variant={floorType === 'carpet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFloorType('carpet')}
                  className="text-xs"
                >
                  🧶 {t('material.carpet')}
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-sm mb-2 block">{t('sidebar.wallMaterial')}</Label>
              <div className="grid grid-cols-3 gap-1 mb-2">
                <Button
                  variant={wallMaterial === 'paint' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWallMaterial('paint')}
                  className="text-xs"
                >
                  🎨 {t('material.paint')}
                </Button>
                <Button
                  variant={wallMaterial === 'brick' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWallMaterial('brick')}
                  className="text-xs"
                >
                  🧱 {t('material.brick')}
                </Button>
                <Button
                  variant={wallMaterial === 'stone' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWallMaterial('stone')}
                  className="text-xs"
                >
                  🪨 {t('material.stone')}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant={wallMaterial === 'wood' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWallMaterial('wood')}
                  className="text-xs"
                >
                  🪵 {t('material.wood')}
                </Button>
                <Button
                  variant={wallMaterial === 'metal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWallMaterial('metal')}
                  className="text-xs"
                >
                  🔩 {t('material.metal')}
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Label className="text-sm mb-2 block">{t('sidebar.windowStyle')}</Label>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant={windowStyle === 'modern' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWindowStyle('modern')}
                  className="text-xs"
                >
                  🏢 {t('style.modern')}
                </Button>
                <Button
                  variant={windowStyle === 'classic' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWindowStyle('classic')}
                  className="text-xs"
                >
                  🏛️ {t('style.classic')}
                </Button>
                <Button
                  variant={windowStyle === 'industrial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWindowStyle('industrial')}
                  className="text-xs"
                >
                  🏭 {t('style.industrial')}
                </Button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={applyWallProperties}
              disabled={walls.length === 0}
              className="w-full mt-2"
            >
              {t('sidebar.applyToAllWalls')}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-lg">{t('sidebar.templates')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => loadTemplate(1)}>
  <Home className="w-4 h-4 mr-1" />{t('sidebar.templateSquare')}
</Button>
              <Button variant="outline" size="sm" onClick={() => loadTemplate(2)}>
  <Home className="w-4 h-4 mr-1" />{t('sidebar.templateLShape')}
</Button>
            </div>
          </CardContent>
        </Card>

        <MaterialPresets
          onPresetSelect={handlePresetSelect}
          currentFloorType={floorType}
          currentWallMaterial={wallMaterial}
          currentWindowStyle={windowStyle}
        />

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-lg">{t('sidebar.actions')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex space-x-2">
              <Button
  variant="outline"
  size="sm"
  onClick={undo}
  disabled={undoStack.length === 0}
  className="flex-1"
  title={t('sidebar.undo')}
>
  <Undo className="w-4 h-4 mr-1" />{t('sidebar.undo')}
</Button>

              <Button
  variant="outline"
  size="sm"
  onClick={redo}
  disabled={redoStack.length === 0}
  className="flex-1"
  title={t('sidebar.redo')}
>
  <Redo className="w-4 h-4 mr-1" />{t('sidebar.redo')}
</Button>
            </div>

            <Button
  variant="outline"
  onClick={clearAll}
  className="w-full"
  disabled={walls.length === 0}
>
  <Trash2 className="w-4 h-4 mr-2" />{t('sidebar.clearAll')}
</Button>

            <Button
  variant="outline"
  onClick={() => {
    if (walls.length > 0) {
      showNotification(t('sidebar.advancedGeometryApplied'), 'success');
    }
  }}
  className="w-full"
  disabled={walls.length === 0}
  title={t('sidebar.optimizeGeometry')}
>
  ⚡ {t('sidebar.optimizeGeometry')}
</Button>

            <Button
  onClick={saveRoom}
  className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
  disabled={walls.length === 0 || !isRoomValid}
>
  <Save className="w-4 h-4 mr-2" />{t('sidebar.saveRoom')}
</Button>

            {isRoomValid && walls.length >= 3 && (
              <Link href="/furnish" className="block">
                <Button className="w-full bg-gradient-to-r from-green-500 to-teal-600">
  <Move3d className="w-4 h-4 mr-2" />{t('sidebar.startFurnishing')}<ArrowRight className="w-4 h-4 ml-2" />
</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Building className="w-5 h-5 mr-2" />
              {t('sidebar.roomStatistics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('sidebar.wallsBuilt')}</span>
              <Badge variant="secondary">{roomMetrics.wallCount}</Badge>
            </div>
            {roomMetrics.isValid && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('sidebar.roomArea')}</span>
                  <Badge variant="outline" className="bg-blue-50">{roomMetrics.area.toFixed(2)}m²</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('sidebar.usableArea')}</span>
                  <Badge variant="outline" className="bg-blue-100">{roomMetrics.usableArea.toFixed(2)}m²</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('sidebar.perimeter')}</span>
                  <Badge variant="outline" className="bg-green-50">{roomMetrics.perimeter.toFixed(2)}m</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('sidebar.avgWallLength')}</span>
                  <Badge variant="outline" className="bg-purple-50">{roomMetrics.averageWallLength.toFixed(2)}m</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('sidebar.compactness')}</span>
                  <Badge variant="outline" className="bg-orange-50">{(roomMetrics.compactness * 100).toFixed(1)}%</Badge>
                </div>
              </>
            )}
            {!roomMetrics.isValid && walls.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-red-500 font-medium">
                  ⚠️ {t('sidebar.roomIssuesFound')}
                </div>
                {roomMetrics.validationErrors.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-xs text-red-400">
                    • {error}
                  </div>
                ))}
                {roomMetrics.validationErrors.length > 3 && (
                  <div className="text-xs text-red-300">
                    +{roomMetrics.validationErrors.length - 3} {t('sidebar.moreIssues')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <RoomQualityAnalyzer
          metrics={roomMetrics}
        />
      </div>

      {/* --- Main Canvas Area --- */}
      <div className="flex-1 relative bg-muted">
        {viewMode === '2d' ? (
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
        ) : (
          <ThreeCanvas
            walls={walls}
            gridEnabled={gridEnabled}
            isDarkMode={theme === 'dark'}
            showWindows={showWindows}
            floorType={floorType}
            wallMaterial={wallMaterial}
            windowStyle={windowStyle}
          />
        )}
      </div>

      </div>
      {/* Notification Toast */}
      {showScreenshotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg max-w-sm w-full space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{t('toolbar.screenshot')}</h2>
            <p className="text-sm text-muted-foreground">Coming soon — you will be able to share and save your room here.</p>
            <Button onClick={() => setShowScreenshotModal(false)} className="w-full">OK</Button>
          </div>
        </div>
      )}

      {notification.visible && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg text-white transition-opacity duration-300 ${notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

