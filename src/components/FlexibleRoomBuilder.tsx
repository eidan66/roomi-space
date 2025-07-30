import React, { useState, useMemo } from 'react';
import { FlexibleThreeCanvas } from './FlexibleThreeCanvas';
import { AdaptiveRenderingSettings } from './AdaptiveRenderingSettings';
import { AdaptiveRenderingOptions, DEFAULT_ADAPTIVE_OPTIONS } from '../lib/adaptive-3d-renderer';
import { Wall } from './Floorplan2DCanvas';

interface FlexibleRoomBuilderProps {
  walls: Wall[];
  floorType: 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet';
  wallMaterial: 'paint' | 'brick' | 'stone' | 'wood' | 'metal';
  windowStyle: 'modern' | 'classic' | 'industrial';
  showWindows: boolean;
}

export const FlexibleRoomBuilder: React.FC<FlexibleRoomBuilderProps> = ({
  walls,
  floorType,
  wallMaterial,
  windowStyle,
  showWindows
}) => {
  const [adaptiveOptions, setAdaptiveOptions] = useState<AdaptiveRenderingOptions>(DEFAULT_ADAPTIVE_OPTIONS);
  const [showSettings, setShowSettings] = useState(false);
  const [renderingNotes, setRenderingNotes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'2d' | '3d' | 'split'>('3d');

  const handleReset = () => {
    setAdaptiveOptions(DEFAULT_ADAPTIVE_OPTIONS);
  };

  const handleRenderingNotes = (notes: string[]) => {
    setRenderingNotes(notes);
  };

  // Calculate some basic stats for comparison
  const originalStats = useMemo(() => {
    if (walls.length === 0) return { area: 0, perimeter: 0 };
    
    // Simple bounding box calculation
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    walls.forEach(wall => {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      minZ = Math.min(minZ, wall.start.z, wall.end.z);
      maxZ = Math.max(maxZ, wall.start.z, wall.end.z);
    });
    
    const area = (maxX - minX) * (maxZ - minZ);
    const perimeter = walls.reduce((sum, wall) => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.z - wall.start.z, 2)
      );
      return sum + length;
    }, 0);
    
    return { area, perimeter };
  }, [walls]);

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="bg-white border-b p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Flexible 3D Room Builder</h2>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === '2d' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              2D Plan
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === '3d' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              3D View
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                viewMode === 'split' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              Split View
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Room Stats */}
          <div className="text-sm text-gray-600">
            Area: {originalStats.area.toFixed(1)}m² | 
            Perimeter: {originalStats.perimeter.toFixed(1)}m | 
            Walls: {walls.length}
          </div>
          
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showSettings 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            3D Settings
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Content Area */}
        <div className={`flex-1 ${viewMode === 'split' ? 'flex' : ''}`}>
          {/* 2D View */}
          {(viewMode === '2d' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2 border-r' : 'w-full'} bg-gray-100 flex items-center justify-center`}>
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">📐</div>
                <div className="text-lg font-medium">2D Floor Plan</div>
                <div className="text-sm">Original dimensions preserved</div>
              </div>
            </div>
          )}

          {/* 3D View */}
          {(viewMode === '3d' || viewMode === 'split') && (
            <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} relative`}>
              {walls.length > 0 ? (
                <FlexibleThreeCanvas
                  walls={walls}
                  floorType={floorType}
                  wallMaterial={wallMaterial}
                  windowStyle={windowStyle}
                  showWindows={showWindows}
                  adaptiveOptions={adaptiveOptions}
                  onRenderingNotes={handleRenderingNotes}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="text-6xl mb-4">🏗️</div>
                    <div className="text-lg font-medium">No Walls to Render</div>
                    <div className="text-sm">Add some walls to see the 3D view</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 border-l bg-gray-50 overflow-y-auto">
            <AdaptiveRenderingSettings
              options={adaptiveOptions}
              onChange={setAdaptiveOptions}
              onReset={handleReset}
            />
          </div>
        )}
      </div>

      {/* Bottom Info Panel */}
      {renderingNotes.length > 0 && (
        <div className="bg-gray-800 text-white p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">3D Rendering Adaptations</span>
            <span className="text-xs opacity-75">
              {renderingNotes.length} adjustments made
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {renderingNotes.slice(0, 6).map((note, index) => (
              <div key={index} className="opacity-90">
                • {note}
              </div>
            ))}
            {renderingNotes.length > 6 && (
              <div className="opacity-75">
                ... and {renderingNotes.length - 6} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border-t p-3 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <span className="text-blue-500 mt-0.5">💡</span>
          <div>
            <strong>Flexible 3D Rendering:</strong> The 3D view may make small adjustments to your 2D dimensions 
            for better visualization and rendering performance. Use the settings panel to control how much 
            adaptation is allowed. Your original 2D plan dimensions are always preserved.
          </div>
        </div>
      </div>
    </div>
  );
};