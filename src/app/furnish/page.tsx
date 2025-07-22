'use client';

import React, { useEffect, useState } from 'react';

import {
  Camera,
  Lightbulb,
  Move3d,
  RotateCw,
  Sofa,
  Trash2,
  TreePine,
} from 'lucide-react';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import ThreeCanvas from '@/components/ThreeCanvas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mock types for now
type Wall = {
  id: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  height: number;
  thickness: number;
};

type RoomObject = {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
};

type StoreItem = {
  id: string;
  name: string;
  model_type: string;
  price: number;
  color: string;
  category: string;
  description: string;
};

export default function RoomFurnishPage() {
  const [objects, setObjects] = useState<RoomObject[]>([
    {
      id: 'obj-test1',
      type: 'chair',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#8B5CF6',
    },
    {
      id: 'obj-test2',
      type: 'table',
      position: { x: 2, y: 0, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: '#8B4513',
    },
  ]);

  const [walls] = useState<Wall[]>([
    {
      id: 'fw1',
      start: { x: -3, y: 0, z: -3 },
      end: { x: 3, y: 0, z: -3 },
      height: 2.5,
      thickness: 0.1,
    },
    {
      id: 'fw2',
      start: { x: 3, y: 0, z: -3 },
      end: { x: 3, y: 0, z: 3 },
      height: 2.5,
      thickness: 0.1,
    },
    {
      id: 'fw3',
      start: { x: 3, y: 0, z: 3 },
      end: { x: -3, y: 0, z: 3 },
      height: 2.5,
      thickness: 0.1,
    },
    {
      id: 'fw4',
      start: { x: -3, y: 0, z: 3 },
      end: { x: -3, y: 0, z: -3 },
      height: 2.5,
      thickness: 0.1,
    },
  ]);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const { theme } = useTheme();
  const [gridSnap, setGridSnap] = useState(true);

  useEffect(() => {
    // Mock fetching store items
    setStoreItems(getPlaceholderStoreItems());
  }, []);

  const getPlaceholderStoreItems = (): StoreItem[] => [
    {
      id: 'chair_basic',
      name: 'Basic Chair',
      model_type: 'chair',
      price: 10,
      color: '#8B5CF6',
      category: 'furniture',
      description: 'A simple chair.',
    },
    {
      id: 'table_basic',
      name: 'Basic Table',
      model_type: 'table',
      price: 25,
      color: '#D2691E',
      category: 'furniture',
      description: 'A sturdy table.',
    },
    {
      id: 'lamp_basic',
      name: 'Table Lamp',
      model_type: 'lamp',
      price: 15,
      color: '#FFD700',
      category: 'lighting',
      description: 'Brightens any room.',
    },
    {
      id: 'plant_small',
      name: 'Small Plant',
      model_type: 'plant',
      price: 8,
      color: '#228B22',
      category: 'plants',
      description: 'Adds a touch of nature.',
    },
    {
      id: 'bed_cozy',
      name: 'Cozy Bed',
      model_type: 'bed',
      price: 50,
      color: '#FF69B4',
      category: 'furniture',
      description: "Perfect for a good night's sleep.",
    },
    {
      id: 'sofa_comfy',
      name: 'Comfy Sofa',
      model_type: 'sofa',
      price: 75,
      color: '#4169E1',
      category: 'furniture',
      description: 'Relaxing seating for the whole family.',
    },
  ];

  const furnitureCategories = [
    { id: 'furniture', name: 'Furniture', icon: Sofa },
    { id: 'lighting', name: 'Lighting', icon: Lightbulb },
    { id: 'plants', name: 'Plants', icon: TreePine },
  ];

  const getItemsForCategory = (categoryId: string) =>
    storeItems.filter((item) => item.category === categoryId);

  const selectedObject = objects.find((obj) => obj.id === selectedObjectId);

  const handleObjectSelect = (objectId: string | null) => {
    setSelectedObjectId(objectId);
  };

  const handleObjectMove = (
    objectId: string,
    newPosition: { x: number; y: number; z: number },
  ) => {
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === objectId
          ? {
              ...obj,
              position: { x: newPosition.x, y: newPosition.y, z: newPosition.z },
            }
          : obj,
      ),
    );
  };

  const rotateSelectedObject = () => {
    if (selectedObjectId) {
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === selectedObjectId
            ? { ...obj, rotation: { ...obj.rotation, y: obj.rotation.y + Math.PI / 4 } }
            : obj,
        ),
      );
    }
  };

  const addObject = (item: StoreItem) => {
    const newObject: RoomObject = {
      id: `obj-${Date.now()}`,
      type: item.model_type,
      position: {
        x: Math.random() * 4 - 2,
        y: 0,
        z: Math.random() * 4 - 2,
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: item.color,
    };
    setObjects((prev) => [...prev, newObject]);
    setSelectedObjectId(newObject.id);
  };

  const deleteSelectedObject = () => {
    if (selectedObjectId) {
      setObjects((prev) => prev.filter((obj) => obj.id !== selectedObjectId));
      setSelectedObjectId(null);
    }
  };

  const takeScreenshot = () => {
    alert('Screenshot feature coming soon! (Requires canvas reference from ThreeCanvas)');
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background">
      <div className="w-full md:w-80 bg-card border-r border-border overflow-y-auto p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl font-bold text-foreground">Furnish Room</h1>
                <p className="text-sm text-muted-foreground">Decorate your space</p>
              </div>
            </div>
          </div>
        </div>

        {selectedObject && (
          <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-900/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Move3d className="w-5 h-5" />
                <span>Selected: {selectedObject.type}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rotateSelectedObject}
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  Rotate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedObject}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Position: ({selectedObject.position.x.toFixed(1)},{' '}
                {selectedObject.position.z.toFixed(1)})
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Grid Snap</Label>
              <Switch checked={gridSnap} onCheckedChange={setGridSnap} />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="furniture" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {furnitureCategories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                <category.icon className="w-4 h-4 mr-1" />
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {furnitureCategories.map((category) => (
            <TabsContent key={category.id} value={category.id}>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getItemsForCategory(category.id).map((item) => (
                  <Card
                    key={item.id}
                    className="border-0 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </h3>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addObject(item)}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {getItemsForCategory(category.id).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No items in this category yet.
                  </p>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={takeScreenshot}
              className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Screenshot
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Objects Placed
              </span>
              <Badge variant="secondary">{objects.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 relative bg-muted">
        <ThreeCanvas
          walls={walls}
          objects={objects}
          isDarkMode={theme === 'dark'}
          gridEnabled={gridSnap}
          selectedObjectId={selectedObjectId}
          onObjectSelect={handleObjectSelect}
          onObjectMove={handleObjectMove}
        />

        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-xl p-4 shadow-lg text-xs md:text-sm max-w-xs">
          <h3 className="font-semibold mb-2 text-foreground">Interactive Controls:</h3>
          <div className="space-y-1 text-muted-foreground">
            <p>
              • <strong>Click</strong> objects to select them
            </p>
            <p>
              • <strong>Drag</strong> selected objects to move
            </p>
            <p>
              • <strong>Right-click + drag</strong> to orbit camera
            </p>
            <p>
              • <strong>Scroll</strong> to zoom in/out
            </p>
            <p>• Use sidebar controls to rotate/delete</p>
          </div>
        </div>

        {selectedObject && (
          <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg w-60">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white capitalize">
              {selectedObject.type} Selected
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>
                Position: ({selectedObject.position.x.toFixed(1)},{' '}
                {selectedObject.position.z.toFixed(1)})
              </p>
              <p>Rotation: {((selectedObject.rotation.y * 180) / Math.PI).toFixed(0)}°</p>
              <div className="flex space-x-2 mt-3">
                <Button size="sm" onClick={rotateSelectedObject} className="flex-1">
                  <RotateCw className="w-3 h-3 mr-1" />
                  Rotate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={deleteSelectedObject}
                  className="flex-1"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
