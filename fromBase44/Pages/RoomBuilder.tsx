import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Building,
  Square,
  RotateCcw,
  Save,
  Palette,
  Move3d,
  Undo,
  Redo,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Room } from "@/entities/Room";
import ThreeCanvas from "../components/ThreeCanvas";

export default function RoomBuilder() {
  const [walls, setWalls] = useState([
    // Initial test walls for immediate visualization
    { id: "wall-test1", start: { x: -2, y: 0, z: -2 }, end: { x: 2, y: 0, z: -2 }, height: 2.5, thickness: 0.1 },
    { id: "wall-test2", start: { x: 2, y: 0, z: -2 }, end: { x: 2, y: 0, z: 2 }, height: 2.5, thickness: 0.1 },
    { id: "wall-test3", start: { x: 2, y: 0, z: 2 }, end: { x: -2, y: 0, z: 2 }, height: 2.5, thickness: 0.1 },
    { id: "wall-test4", start: { x: -2, y: 0, z: 2 }, end: { x: -2, y: 0, z: -2 }, height: 2.5, thickness: 0.1 },
  ]);
  const [selectedTool, setSelectedTool] = useState('wall');
  const [gridEnabled, setGridEnabled] = useState(true);
  const [wallHeight, setWallHeight] = useState(2.5);
  const [wallThickness, setWallThickness] = useState(0.1);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [roomName, setRoomName] = useState("My Dream Room");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Sync with system/localStorage theme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const userPreference = localStorage.getItem('theme');
    setIsDarkMode(userPreference === 'dark' || (!userPreference && mediaQuery.matches));
    
    const handleChange = (e) => setIsDarkMode(e.matches && !localStorage.getItem('theme') || localStorage.getItem('theme') === 'dark');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const addWall = (start, end) => {
    const newWall = {
      id: `wall-${Date.now()}`,
      start: { x: start?.x || 0, y: 0, z: start?.z || 0 },
      end: { x: end?.x || 1, y: 0, z: end?.z || 0 },
      height: wallHeight,
      thickness: wallThickness
    };

    setUndoStack(prev => [...prev, walls]);
    setRedoStack([]);
    setWalls(prev => [...prev, newWall]);
  };

  const clearAll = () => {
    setUndoStack(prev => [...prev, walls]);
    setRedoStack([]);
    setWalls([]);
  };

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

  const saveRoom = async () => {
    try {
      await Room.create({
        name: roomName,
        walls,
        objects: [],
        coins_spent: 0
      });
      alert("Room saved successfully!");
    }
    catch (error) {
      console.error("Error saving room:", error);
      alert("Error saving room. Please try again.");
    }
  };

  // Placeholder for adding a wall from UI until 3D interaction is reimplemented
  const handleAddPlaceholderWall = () => {
    // Adds a 2-unit long wall extending from the end of the last wall
    const lastWall = walls.length > 0 ? walls[walls.length - 1] : null;
    const newStartX = lastWall ? lastWall.end.x : 0;
    const newStartZ = lastWall ? lastWall.end.z : 0;
    addWall({x: newStartX, z: newStartZ}, {x: newStartX + 2, z: newStartZ});
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar - Tools */}
      <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Room Builder</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Draw your dream room</p>
              </div>
            </div>
            
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Room name..."
            />
          </div>

        {/* Tools */}
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
              onClick={() => {setSelectedTool('wall'); handleAddPlaceholderWall();}}
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

        {/* Wall Properties */}
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Wall Properties</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Height: {wallHeight.toFixed(1)}m</Label>
                <Slider
                  value={[wallHeight]}
                  onValueChange={(value) => setWallHeight(value[0])}
                  min={1}
                  max={4}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              <div>
                <Label className="text-sm mb-2 block">Thickness: {wallThickness.toFixed(2)}m</Label>
                <Slider
                  value={[wallThickness]}
                  onValueChange={(value) => setWallThickness(value[0])}
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
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
              
              <Button
                variant="outline"
                onClick={clearAll}
                className="w-full"
              >
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
                <Link to={createPageUrl("RoomFurnish")} className="block">
                  <Button className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700">
                    <Move3d className="w-4 h-4 mr-2" />
                    Start Furnishing (Test)
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Walls Built</span>
                <Badge variant="secondary">{walls.length}</Badge>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-gray-200 dark:bg-gray-700">
        <ThreeCanvas walls={walls} gridEnabled={gridEnabled} isDarkMode={isDarkMode} />
        {/* Instructions Overlay */}
        <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg text-xs md:text-sm max-w-xs">
          <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">3D View Controls:</h3>
          <div className="space-y-1 text-gray-600 dark:text-gray-300">
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