'use client';

import React from 'react';

export interface ColorPaletteProps {
  colors: string[];
  selected: string;
  onSelect: (hex: string) => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ colors, selected, onSelect }) => (
  <div className="flex flex-wrap gap-1 p-2 bg-card border border-border rounded-md">
    {colors.map((c) => (
      <button
        key={c}
        onClick={() => onSelect(c)}
        className={`w-6 h-6 border-2 ${selected === c ? 'border-primary' : 'border-transparent'}`}
        style={{
          backgroundColor: c,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        }}
        title={c}
      />
    ))}
  </div>
);

export default ColorPalette;
