import React from 'react';

import { AdaptiveRenderingOptions } from '../lib/adaptive-3d-renderer';

interface AdaptiveRenderingSettingsProps {
  options: AdaptiveRenderingOptions;
  onChange: (options: AdaptiveRenderingOptions) => void;
  onReset: () => void;
}

export const AdaptiveRenderingSettings: React.FC<AdaptiveRenderingSettingsProps> = ({
  options,
  onChange,
  onReset,
}) => {
  const handleToggle = (key: keyof AdaptiveRenderingOptions) => {
    onChange({
      ...options,
      [key]: !options[key],
    });
  };

  const handleSliderChange = (key: keyof AdaptiveRenderingOptions, value: number) => {
    onChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">3D Rendering Settings</h3>
        <button
          onClick={onReset}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
        >
          Reset to Default
        </button>
      </div>

      <div className="space-y-4">
        {/* Tolerance Settings */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-700 mb-3">Tolerance Settings</h4>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Vertex Snap Tolerance: {options.vertexSnapTolerance.toFixed(2)}m
              </label>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={options.vertexSnapTolerance}
                onChange={(e) =>
                  handleSliderChange('vertexSnapTolerance', parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-500 mt-1">
                How close vertices need to be to snap together
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Angle Snap Tolerance: {options.angleSnapTolerance.toFixed(0)}°
              </label>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={options.angleSnapTolerance}
                onChange={(e) =>
                  handleSliderChange('angleSnapTolerance', parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-500 mt-1">
                Tolerance for snapping to common angles
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Minimum Wall Length: {options.minWallLength.toFixed(2)}m
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={options.minWallLength}
                onChange={(e) =>
                  handleSliderChange('minWallLength', parseFloat(e.target.value))
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-xs text-gray-500 mt-1">
                Minimum wall length for 3D rendering
              </div>
            </div>
          </div>
        </div>

        {/* Adaptive Behavior */}
        <div className="border-b pb-4">
          <h4 className="font-medium text-gray-700 mb-3">Adaptive Behavior</h4>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.allowDimensionAdjustment}
                onChange={() => handleToggle('allowDimensionAdjustment')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Allow Dimension Adjustment
                </span>
                <div className="text-xs text-gray-500">
                  Allow minor dimension adjustments for better 3D rendering
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.preserveDesignIntent}
                onChange={() => handleToggle('preserveDesignIntent')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Preserve Design Intent
                </span>
                <div className="text-xs text-gray-500">
                  Maintain overall room shape even if dimensions change slightly
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.autoFixTopology}
                onChange={() => handleToggle('autoFixTopology')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Auto-Fix Topology
                </span>
                <div className="text-xs text-gray-500">
                  Automatically fix topology issues for better 3D rendering
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Visual Quality */}
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Visual Quality</h4>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.smoothTransitions}
                onChange={() => handleToggle('smoothTransitions')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Smooth Transitions
                </span>
                <div className="text-xs text-gray-500">
                  Smooth wall joints and transitions for better appearance
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={options.optimizeForRendering}
                onChange={() => handleToggle('optimizeForRendering')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Optimize for Rendering
                </span>
                <div className="text-xs text-gray-500">
                  Optimize geometry for better 3D performance
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Preset Configurations */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-3">Quick Presets</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() =>
              onChange({
                vertexSnapTolerance: 0.05,
                angleSnapTolerance: 2,
                minWallLength: 0.1,
                allowDimensionAdjustment: false,
                preserveDesignIntent: true,
                autoFixTopology: false,
                smoothTransitions: false,
                optimizeForRendering: false,
              })
            }
            className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
          >
            Strict Mode
          </button>

          <button
            onClick={() =>
              onChange({
                vertexSnapTolerance: 0.1,
                angleSnapTolerance: 5,
                minWallLength: 0.2,
                allowDimensionAdjustment: true,
                preserveDesignIntent: true,
                autoFixTopology: true,
                smoothTransitions: true,
                optimizeForRendering: true,
              })
            }
            className="px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded transition-colors"
          >
            Balanced
          </button>

          <button
            onClick={() =>
              onChange({
                vertexSnapTolerance: 0.3,
                angleSnapTolerance: 10,
                minWallLength: 0.5,
                allowDimensionAdjustment: true,
                preserveDesignIntent: false,
                autoFixTopology: true,
                smoothTransitions: true,
                optimizeForRendering: true,
              })
            }
            className="px-3 py-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-800 rounded transition-colors"
          >
            Flexible
          </button>
        </div>
      </div>

      {/* Information Panel */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-700 mb-2">How It Works</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Strict Mode:</strong> Minimal adjustments, preserves exact 2D
            dimensions
          </p>
          <p>
            <strong>Balanced:</strong> Smart adjustments for better 3D while preserving
            design intent
          </p>
          <p>
            <strong>Flexible:</strong> Maximum adaptability for optimal 3D rendering
          </p>
        </div>
      </div>
    </div>
  );
};
