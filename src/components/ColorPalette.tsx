'use client';

import React from 'react';

import { HexColorPicker } from 'react-colorful';

export interface ColorPaletteProps {
  colors: string[];
  selected: string;
  onSelect: (hex: string) => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ colors, selected, onSelect }) => (
  <div className="flex flex-col gap-2 p-2 bg-card border border-border rounded-md">
    {/* Hex Color Picker */}
    <div className="flex justify-center">
      <HexColorPicker color={selected} onChange={onSelect} />
    </div>

    {/* Quick Color Swatches */}
    <div className="flex flex-wrap gap-1 justify-center">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`w-6 h-6 border-2 rounded-sm ${selected === c ? 'border-primary' : 'border-transparent'}`}
          style={{
            backgroundColor: c,
          }}
          title={c}
        />
      ))}
    </div>
  </div>
);

export default ColorPalette;
