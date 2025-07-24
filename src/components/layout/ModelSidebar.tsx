'use client';

import React from 'react';
import {
  Sofa,
  Lamp,
  Coffee,
  Flower,
  Palette,
  Square,
  Grid3x3,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/features/store';
import { setActiveCategory, addObject } from '@/features/roomSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RoomObject } from '@/types/room';

const ModelSidebar = () => {
  const dispatch = useDispatch();
  const { activeCategory, selectedColor, objects } = useSelector(
    (state: RootState) => state.room,
  );

  const categories = [
    {
      id: 'furniture',
      name: 'Furniture',
      icon: Sofa,
      items: [
        { id: 'sofa', name: 'Sofa', color: '#8B4513', canStack: false, canHost: true },
        { id: 'chair', name: 'Chair', color: '#654321', canStack: false, canHost: false },
        { id: 'table', name: 'Table', color: '#D2691E', canStack: false, canHost: true },
        {
          id: 'nightstand',
          name: 'Nightstand',
          color: '#CD853F',
          canStack: false,
          canHost: true,
        },
        { id: 'bed', name: 'Bed', color: '#F5DEB3', canStack: false, canHost: true },
        {
          id: 'wardrobe',
          name: 'Wardrobe',
          color: '#8B4513',
          canStack: false,
          canHost: false,
        },
        {
          id: 'bookshelf',
          name: 'Bookshelf',
          color: '#A0522D',
          canStack: false,
          canHost: true,
        },
        { id: 'desk', name: 'Desk', color: '#D2691E', canStack: false, canHost: true },
      ],
    },
    {
      id: 'carpets',
      name: 'Carpets',
      icon: Grid3x3,
      items: [
        {
          id: 'rug_small',
          name: 'Small Rug',
          color: '#8B0000',
          canStack: false,
          canHost: true,
        },
        {
          id: 'rug_medium',
          name: 'Medium Rug',
          color: '#DC143C',
          canStack: false,
          canHost: true,
        },
        {
          id: 'rug_large',
          name: 'Large Rug',
          color: '#B22222',
          canStack: false,
          canHost: true,
        },
        {
          id: 'carpet_persian',
          name: 'Persian Carpet',
          color: '#800000',
          canStack: false,
          canHost: true,
        },
        {
          id: 'carpet_modern',
          name: 'Modern Carpet',
          color: '#228B22',
          canStack: false,
          canHost: true,
        },
      ],
    },
    {
      id: 'lamps',
      name: 'Lamps',
      icon: Lamp,
      items: [
        {
          id: 'table_lamp',
          name: 'Table Lamp',
          color: '#FFD700',
          canStack: true,
          canHost: false,
        },
        {
          id: 'floor_lamp',
          name: 'Floor Lamp',
          color: '#FFA500',
          canStack: false,
          canHost: false,
        },
        {
          id: 'ceiling_lamp',
          name: 'Ceiling Lamp',
          color: '#FFFF00',
          canStack: false,
          canHost: false,
        },
        {
          id: 'desk_lamp',
          name: 'Desk Lamp',
          color: '#FFE4B5',
          canStack: true,
          canHost: false,
        },
        {
          id: 'pendant_light',
          name: 'Pendant Light',
          color: '#F0E68C',
          canStack: false,
          canHost: false,
        },
      ],
    },
    {
      id: 'appliances',
      name: 'Appliances',
      icon: Coffee,
      items: [
        { id: 'tv', name: 'TV', color: '#000000', canStack: true, canHost: false },
        {
          id: 'refrigerator',
          name: 'Refrigerator',
          color: '#C0C0C0',
          canStack: false,
          canHost: true,
        },
        {
          id: 'microwave',
          name: 'Microwave',
          color: '#808080',
          canStack: true,
          canHost: false,
        },
        {
          id: 'washing_machine',
          name: 'Washing Machine',
          color: '#FFFFFF',
          canStack: false,
          canHost: true,
        },
        {
          id: 'dishwasher',
          name: 'Dishwasher',
          color: '#D3D3D3',
          canStack: false,
          canHost: false,
        },
        { id: 'oven', name: 'Oven', color: '#2F4F4F', canStack: false, canHost: true },
      ],
    },
    {
      id: 'decorative',
      name: 'Decorative Items',
      icon: Flower,
      items: [
        { id: 'vase', name: 'Vase', color: '#4169E1', canStack: true, canHost: false },
        { id: 'plant', name: 'Plant', color: '#228B22', canStack: true, canHost: false },
        {
          id: 'picture_frame',
          name: 'Picture Frame',
          color: '#8B4513',
          canStack: true,
          canHost: false,
        },
        {
          id: 'candle',
          name: 'Candle',
          color: '#FFFACD',
          canStack: true,
          canHost: false,
        },
        {
          id: 'sculpture',
          name: 'Sculpture',
          color: '#696969',
          canStack: true,
          canHost: false,
        },
        {
          id: 'mirror',
          name: 'Mirror',
          color: '#E6E6FA',
          canStack: false,
          canHost: false,
        },
        { id: 'clock', name: 'Clock', color: '#8B4513', canStack: true, canHost: false },
      ],
    },
    {
      id: 'textures',
      name: 'Textures',
      icon: Palette,
      items: [
        { id: 'wood_oak', name: 'Oak Wood', color: '#DEB887' },
        { id: 'wood_pine', name: 'Pine Wood', color: '#F5DEB3' },
        { id: 'marble_white', name: 'White Marble', color: '#F8F8FF' },
        { id: 'marble_black', name: 'Black Marble', color: '#2F4F4F' },
        { id: 'brick_red', name: 'Red Brick', color: '#B22222' },
        { id: 'concrete', name: 'Concrete', color: '#808080' },
        { id: 'tile_ceramic', name: 'Ceramic Tile', color: '#FFFFFF' },
        { id: 'tile_stone', name: 'Stone Tile', color: '#696969' },
      ],
    },
    {
      id: 'walls',
      name: 'Walls',
      icon: Square,
      items: [],
    },
    {
      id: 'floors',
      name: 'Floor',
      icon: Grid3x3,
      items: [],
    },
  ];

  const handleCategoryChange = (categoryId: string) => {
    dispatch(setActiveCategory(categoryId as any));
  };

  const handleAddObject = (item: any) => {
    const newObject: RoomObject = {
      id: `${item.id}-${Date.now()}`,
      type: item.id,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      color: selectedColor || item.color,
      material: item.id,
    };

    dispatch(addObject(newObject));
  };

  const activeTab = categories.find((cat) => cat.id === activeCategory);

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          3D Models & Textures
        </h2>

        {/* Category Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(category.id)}
              className="flex items-center justify-center space-x-1 h-12"
            >
              <category.icon className="w-4 h-4" />
              <span className="text-xs">{category.name}</span>
            </Button>
          ))}
        </div>

        {/* Active Category Content */}
        {activeTab && activeTab.items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <activeTab.icon className="w-5 h-5" />
                <span>{activeTab.name}</span>
                <Badge variant="secondary">{activeTab.items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeTab.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-500"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </p>
                      {'canStack' in item && (
                        <div className="flex space-x-2 text-xs text-gray-500">
                          {'canHost' in item && item.canHost && (
                            <span>Can host objects</span>
                          )}
                          {'canStack' in item && item.canStack && <span>Stackable</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddObject(item)}
                    title={`Add ${item.name}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Special handling for walls and floors */}
        {(activeCategory === 'walls' || activeCategory === 'floors') && activeTab && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <activeTab.icon className="w-5 h-5" />
                <span>{activeTab.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {activeCategory === 'walls'
                  ? 'Select a wall and use the paint tool to apply colors or textures.'
                  : 'Use the paint tool to apply colors or textures to the floor.'}
              </p>
              <div className="text-center">
                <Button variant="outline" size="sm">
                  Use Paint Tool
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Textures category special handling */}
        {activeCategory === 'textures' && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">How to Apply Textures</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>1. Select a texture from above</li>
                <li>2. Switch to Paint tool</li>
                <li>3. Click on walls, floors, or furniture to apply</li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Objects counter */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Objects in Room
            </span>
            <Badge variant="secondary">{objects.length}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSidebar;
