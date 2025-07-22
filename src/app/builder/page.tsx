'use client';

import React, { useState } from 'react';

import {
  ArrowRight,
  Building,
  Move3d,
  Palette,
  Redo,
  RotateCcw,
  Save,
  Square,
  Undo,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import Image from 'next/image';

import ThreeCanvas from '@/components/ThreeCanvas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type Wall = {
  id: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  height: number;
  thickness: number;
};

export default function RoomBuilderPage() {
  const [walls, setWalls] = useState<Wall[]>([
    {
      id: 'wall-test1',
      start: { x: -2, y: 0, z: -2 },
      end: { x: 2, y: 0, z: -2 },
      height: 2.5,
      thickness: 0.1,
    },
    {
      id: 'wall-test2',
      start: { x: 2, y: 0, z: -2 },
      end: { x: 2, y: 0, z: 2 },
      height: 2.5,
      thickness: 0.1,
    },
    {
      id: 'wall-test3',
      start: { x: 2, y: 0, z: 2 },
      end: { x: -2, y: 0, z: 2 },
      height: 2.5,
      thickness: 0.1,
    },
    {
      id: 'wall-test4',
      start: { x: -2, y: 0, z: 2 },
      end: { x: -2, y: 0, z: -2 },
      height: 2.5,
      thickness: 0.1,
    },
  ]);
  const [selectedTool, setSelectedTool] = useState('wall');
  const [gridEnabled, setGridEnabled] = useState(true);
  const [wallHeight, setWallHeight] = useState(2.5);
  const [wallThickness, setWallThickness] = useState(0.1);
  const [undoStack, setUndoStack] = useState<Wall[][]>([]);
  const [redoStack, setRedoStack] = useState<Wall[][]>([]);
  const [roomName, setRoomName] = useState('My Dream Room');
  const { theme } = useTheme();

  const addWall = (start: { x: number; z: number }, end: { x: number; z: number }) => {
    const newWall: Wall = {
      id: `wall-${Date.now()}`,
      start: { x: start?.x || 0, y: 0, z: start?.z || 0 },
      end: { x: end?.x || 1, y: 0, z: end?.z || 0 },
      height: wallHeight,
      thickness: wallThickness,
    };

    setUndoStack((prev) => [...prev, walls]);
    setRedoStack([]);
    setWalls((prev) => [...prev, newWall]);
  };

  const clearAll = () => {
    setUndoStack((prev) => [...prev, walls]);
    setRedoStack([]);
    setWalls([]);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack((prev) => [walls, ...prev]);
      setUndoStack((prev) => prev.slice(0, -1));
      setWalls(previousState);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      setUndoStack((prev) => [...prev, walls]);
      setRedoStack((prev) => prev.slice(1));
      setWalls(nextState);
    }
  };

  const saveRoom = () => {
    // Mock save
    alert('Room saved!');
  };

  const handleAddPlaceholderWall = () => {
    const lastWall = walls.length > 0 ? walls[walls.length - 1] : null;
    const newStartX = lastWall ? lastWall.end.x : 0;
    const newStartZ = lastWall ? lastWall.end.z : 0;
    addWall({ x: newStartX, z: newStartZ }, { x: newStartX + 2, z: newStartZ });
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background">
      <div className="w-full md:w-80 bg-card border-r border-border overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-white/90">
              <Image
                src="/images/roomi-logo-light.jpeg"
                alt="ROOMI Space Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Room Builder</h1>
              <p className="text-sm text-muted-foreground">Draw your dream room</p>
            </div>
          </div>

          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Room name..."
          />
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Square className="w-5 h-5" />
              <span>Drawing Tools</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant={selectedTool === 'wall' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => {
                setSelectedTool('wall');
                handleAddPlaceholderWall();
              }}
            >
              <Building className="w-4 h-4 mr-2" />
              Add Wall (Placeholder)
            </Button>

            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show Grid</Label>
                <Switch checked={gridEnabled} onCheckedChange={setGridEnabled} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>Wall Properties</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">
                Height: {wallHeight.toFixed(1)}m
              </Label>
              <Slider
                value={[wallHeight]}
                onValueChange={([value]) => setWallHeight(value)}
                min={1}
                max={4}
                step={0.1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm mb-2 block">
                Thickness: {wallThickness.toFixed(2)}m
              </Label>
              <Slider
                value={[wallThickness]}
                onValueChange={([value]) => setWallThickness(value)}
                min={0.05}
                max={0.3}
                step={0.01}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={undoStack.length === 0}
                className="flex-1"
              >
                <Undo className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={redoStack.length === 0}
                className="flex-1"
              >
                <Redo className="w-4 h-4 mr-1" />
                Redo
              </Button>
            </div>

            <Button variant="outline" onClick={clearAll} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear All
            </Button>

            <Button
              onClick={saveRoom}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={walls.length === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Room
            </Button>

            {walls.length >= 1 && (
              <Link href="/furnish" className="block">
                <Button className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700">
                  <Move3d className="w-4 h-4 mr-2" />
                  Start Furnishing (Test)
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Walls Built</span>
              <Badge variant="secondary">{walls.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 relative bg-muted">
        <ThreeCanvas
          walls={walls}
          gridEnabled={gridEnabled}
          isDarkMode={theme === 'dark'}
        />
        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-xl p-4 shadow-lg text-xs md:text-sm max-w-xs">
          <h3 className="font-semibold mb-2 text-foreground">3D View Controls:</h3>
          <div className="space-y-1 text-muted-foreground">
            <p>• Orbit: Left-Click & Drag</p>
            <p>• Zoom: Scroll Wheel</p>
            <p>• Pan: Right-Click & Drag / Ctrl + Left-Click & Drag</p>
            <p className="mt-2">Use sidebar to add/modify walls.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
