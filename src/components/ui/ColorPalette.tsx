'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/features/store';
import { setSelectedColor, setShowColorPalette } from '@/features/roomSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

const ColorPalette = () => {
  const dispatch = useDispatch();
  const { colorPalette, selectedColor, showColorPalette } = useSelector(
    (state: RootState) => state.room,
  );

  const handleColorSelect = (color: string) => {
    dispatch(setSelectedColor(color));
  };

  const handleClose = () => {
    dispatch(setShowColorPalette(false));
  };

  if (!showColorPalette) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Color Palette</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a color to paint walls, floors, and furniture
            </p>

            {/* Color Grid */}
            <div className="grid grid-cols-5 gap-3">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-110 ${
                    selectedColor === color
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* Custom Color Input */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Custom Color
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Selected Color Preview */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-500"
                style={{ backgroundColor: selectedColor }}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Selected Color
                </p>
                <p className="text-xs text-gray-500">{selectedColor}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Apply Color
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ColorPalette;
