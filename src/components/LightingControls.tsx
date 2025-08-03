'use client';

import React from 'react';

import { Lightbulb, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface LightingControlsProps {
  ambientIntensity: number;
  setAmbientIntensity: (value: number) => void;
  directionalIntensity: number;
  setDirectionalIntensity: (value: number) => void;
  shadowsEnabled: boolean;
  setShadowsEnabled: (enabled: boolean) => void;
  lightingPreset: 'day' | 'evening' | 'night';
  setLightingPreset: (preset: 'day' | 'evening' | 'night') => void;
}

const LightingControls: React.FC<LightingControlsProps> = ({
  ambientIntensity,
  setAmbientIntensity,
  directionalIntensity,
  setDirectionalIntensity,
  shadowsEnabled,
  setShadowsEnabled,
  lightingPreset,
  setLightingPreset,
}) => {
  const applyLightingPreset = (preset: 'day' | 'evening' | 'night') => {
    setLightingPreset(preset);

    switch (preset) {
      case 'day':
        setAmbientIntensity(0.4);
        setDirectionalIntensity(1.0);
        setShadowsEnabled(true);
        break;
      case 'evening':
        setAmbientIntensity(0.6);
        setDirectionalIntensity(0.6);
        setShadowsEnabled(true);
        break;
      case 'night':
        setAmbientIntensity(0.8);
        setDirectionalIntensity(0.3);
        setShadowsEnabled(false);
        break;
      default:
        // Default to day preset
        setAmbientIntensity(0.4);
        setDirectionalIntensity(1.0);
        setShadowsEnabled(true);
        break;
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Lightbulb className="w-5 h-5 mr-2" />
          Lighting Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm mb-2 block">Lighting Presets</Label>
          <div className="grid grid-cols-3 gap-1">
            <Button
              variant={lightingPreset === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyLightingPreset('day')}
              className="text-xs"
            >
              <Sun className="w-3 h-3 mr-1" />
              Day
            </Button>
            <Button
              variant={lightingPreset === 'evening' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyLightingPreset('evening')}
              className="text-xs"
            >
              🌅 Evening
            </Button>
            <Button
              variant={lightingPreset === 'night' ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyLightingPreset('night')}
              className="text-xs"
            >
              <Moon className="w-3 h-3 mr-1" />
              Night
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm mb-2 block">
            Ambient Light: {(ambientIntensity * 100).toFixed(0)}%
          </Label>
          <Slider
            value={[ambientIntensity]}
            onValueChange={([v]) => setAmbientIntensity(v)}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>

        <div>
          <Label className="text-sm mb-2 block">
            Sun Light: {(directionalIntensity * 100).toFixed(0)}%
          </Label>
          <Slider
            value={[directionalIntensity]}
            onValueChange={([v]) => setDirectionalIntensity(v)}
            min={0}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Label className="text-sm">Realistic Shadows</Label>
          <Switch checked={shadowsEnabled} onCheckedChange={setShadowsEnabled} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LightingControls;
