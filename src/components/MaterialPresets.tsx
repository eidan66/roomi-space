'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface MaterialPreset {
  name: string;
  description: string;
  floorType: 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet';
  wallMaterial: 'paint' | 'brick' | 'stone' | 'wood' | 'metal';
  windowStyle: 'modern' | 'classic' | 'industrial';
  icon: string;
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    name: 'Modern Minimalist',
    description: 'Clean lines with concrete floors and modern windows',
    floorType: 'concrete',
    wallMaterial: 'paint',
    windowStyle: 'modern',
    icon: '🏢'
  },
  {
    name: 'Classic Elegance',
    description: 'Timeless marble floors with wooden walls',
    floorType: 'marble',
    wallMaterial: 'wood',
    windowStyle: 'classic',
    icon: '🏛️'
  },
  {
    name: 'Industrial Loft',
    description: 'Raw brick walls with concrete floors',
    floorType: 'concrete',
    wallMaterial: 'brick',
    windowStyle: 'industrial',
    icon: '🏭'
  },
  {
    name: 'Cozy Home',
    description: 'Warm wood floors with painted walls',
    floorType: 'wood',
    wallMaterial: 'paint',
    windowStyle: 'classic',
    icon: '🏠'
  },
  {
    name: 'Luxury Suite',
    description: 'Premium marble with stone accents',
    floorType: 'marble',
    wallMaterial: 'stone',
    windowStyle: 'modern',
    icon: '💎'
  },
  {
    name: 'Office Space',
    description: 'Professional carpet with modern finishes',
    floorType: 'carpet',
    wallMaterial: 'paint',
    windowStyle: 'modern',
    icon: '🏢'
  }
];

interface MaterialPresetsProps {
  onPresetSelect: (preset: MaterialPreset) => void;
  currentFloorType: string;
  currentWallMaterial: string;
  currentWindowStyle: string;
}

const MaterialPresets: React.FC<MaterialPresetsProps> = ({
  onPresetSelect,
  currentFloorType,
  currentWallMaterial,
  currentWindowStyle
}) => {
  const isCurrentPreset = (preset: MaterialPreset) => {
    return preset.floorType === currentFloorType &&
           preset.wallMaterial === currentWallMaterial &&
           preset.windowStyle === currentWindowStyle;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Material Presets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 gap-2">
          {MATERIAL_PRESETS.map((preset, index) => (
            <Button
              key={index}
              variant={isCurrentPreset(preset) ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetSelect(preset)}
              className="justify-start text-left h-auto p-3"
            >
              <div className="flex items-start space-x-3">
                <span className="text-lg">{preset.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {preset.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MaterialPresets;