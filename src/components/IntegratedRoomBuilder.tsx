import React, { useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { addWall, removeWall, toggleAdvancedMetrics } from '../features/roomSlice';
import { Wall } from '../lib/advanced-room-calculator';
import { RootState } from '../features/store';

import { AdvancedRoomMetrics } from './AdvancedRoomMetrics';
import RoomQualityAnalyzer from './RoomQualityAnalyzer';

/**
 * Example of how to integrate the Advanced Room Calculator
 * into an existing room builder component
 */
export const IntegratedRoomBuilder: React.FC = () => {
  const dispatch = useDispatch();
  const { walls, metrics, showAdvancedMetrics } = useSelector(
    (state: RootState) => state.room,
  );
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);

  // Example: Add a simple rectangular room
  const addRectangularRoom = () => {
    const roomWalls: Wall[] = [
      {
        id: 'wall-1',
        start: { x: 0, z: 0 },
        end: { x: 6, z: 0 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-2',
        start: { x: 6, z: 0 },
        end: { x: 6, z: 4 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-3',
        start: { x: 6, z: 4 },
        end: { x: 0, z: 4 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-4',
        start: { x: 0, z: 4 },
        end: { x: 0, z: 0 },
        height: 3,
        thickness: 0.2,
      },
    ];

    roomWalls.forEach((wall) => dispatch(addWall(wall)));
  };

  // Example: Add an L-shaped room
  const addLShapedRoom = () => {
    const roomWalls: Wall[] = [
      {
        id: 'wall-1',
        start: { x: 0, z: 0 },
        end: { x: 6, z: 0 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-2',
        start: { x: 6, z: 0 },
        end: { x: 6, z: 3 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-3',
        start: { x: 6, z: 3 },
        end: { x: 3, z: 3 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-4',
        start: { x: 3, z: 3 },
        end: { x: 3, z: 6 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-5',
        start: { x: 3, z: 6 },
        end: { x: 0, z: 6 },
        height: 3,
        thickness: 0.2,
      },
      {
        id: 'wall-6',
        start: { x: 0, z: 6 },
        end: { x: 0, z: 0 },
        height: 3,
        thickness: 0.2,
      },
    ];

    roomWalls.forEach((wall) => dispatch(addWall(wall)));
  };

  const handleRemoveWall = (wallId: string) => {
    dispatch(removeWall(wallId));
    if (selectedWallId === wallId) {
      setSelectedWallId(null);
    }
  };

  const getQualityColor = (isValid: boolean, area: number): string => {
    if (!isValid) {
      return 'text-red-600';
    }
    if (area < 6) {
      return 'text-yellow-600';
    }
    if (area > 100) {
      return 'text-orange-600';
    }
    return 'text-green-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Room Builder</h1>
        <p className="text-gray-600">
          Build rooms with comprehensive analysis and validation
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Room Templates</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={addRectangularRoom}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add Rectangle (6×4m)
          </button>
          <button
            onClick={addLShapedRoom}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Add L-Shape
          </button>
          <button
            onClick={() => dispatch(toggleAdvancedMetrics())}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showAdvancedMetrics
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showAdvancedMetrics ? 'Hide' : 'Show'} Advanced Metrics
          </button>
        </div>
      </div>

      {/* Room Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Room Status</h3>
          <p
            className={`text-2xl font-bold ${getQualityColor(metrics.isValid, metrics.area)}`}
          >
            {metrics.isValid ? '✓ Valid' : '✗ Invalid'}
          </p>
          <p className="text-sm text-gray-600">
            {metrics.validationErrors.length} issues
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Area</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.area.toFixed(1)}m²</p>
          <p className="text-sm text-gray-600">
            {metrics.usableArea.toFixed(1)}m² usable
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Shape Quality</h3>
          <p className="text-2xl font-bold text-green-600">
            {(metrics.compactness * 100).toFixed(0)}%
          </p>
          <p className="text-sm text-gray-600">Compactness score</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Walls</h3>
          <p className="text-2xl font-bold text-purple-600">{metrics.wallCount}</p>
          <p className="text-sm text-gray-600">
            Avg: {metrics.averageWallLength.toFixed(1)}m
          </p>
        </div>
      </div>

      {/* Wall List */}
      {walls.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Wall Details</h2>
          <div className="space-y-2">
            {walls.map((wall, index) => {
              const length = Math.sqrt(
                Math.pow(wall.end.x - wall.start.x, 2) +
                  Math.pow(wall.end.z - wall.start.z, 2),
              );
              const isSelected = selectedWallId === wall.id;

              return (
                <div
                  key={wall.id}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedWallId(isSelected ? null : wall.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Wall {index + 1}</span>
                      <span className="ml-2 text-gray-600">
                        {length.toFixed(2)}m × {wall.height}m × {wall.thickness}m
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        ({wall.start.x}, {wall.start.z}) → ({wall.end.x}, {wall.end.z})
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveWall(wall.id);
                        }}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Analysis */}
        <RoomQualityAnalyzer metrics={metrics} />

        {/* Advanced Metrics */}
        {showAdvancedMetrics && (
          <AdvancedRoomMetrics metrics={metrics} showAdvanced={true} />
        )}
      </div>

      {/* Validation Errors */}
      {metrics.validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            Room Validation Issues
          </h2>
          <ul className="space-y-2">
            {metrics.validationErrors.map((error, index) => (
              <li key={index} className="flex items-start gap-2 text-red-700">
                <span className="text-red-500 mt-1">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-red-100 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Tip:</strong> Fix these issues to ensure your room design is valid
              and constructible.
            </p>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          How to Use Advanced Room Calculator
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Key Features</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Comprehensive geometric validation</li>
              <li>• Advanced shape quality metrics</li>
              <li>• Construction feasibility analysis</li>
              <li>• Detailed wall and angle measurements</li>
              <li>• Space efficiency calculations</li>
              <li>• Real-time error detection</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Quality Metrics</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>
                • <strong>Compactness:</strong> How close to a circle (efficiency)
              </li>
              <li>
                • <strong>Convexity:</strong> How convex the shape is
              </li>
              <li>
                • <strong>Rectangularity:</strong> How close to a rectangle
              </li>
              <li>
                • <strong>Aspect Ratio:</strong> Width to height proportion
              </li>
              <li>
                • <strong>Wall-to-Floor Ratio:</strong> Space efficiency
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
