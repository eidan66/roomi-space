import React, { useState } from 'react';
import { AdvancedRoomCalculator, Wall } from '../lib/advanced-room-calculator';
import { AdvancedRoomMetrics } from './AdvancedRoomMetrics';

export const RoomCalculatorDemo: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<string>('rectangle');

  // Demo room configurations
  const demoRooms: Record<string, Wall[]> = {
    rectangle: [
      { id: '1', start: { x: 0, z: 0 }, end: { x: 6, z: 0 }, height: 3, thickness: 0.2 },
      { id: '2', start: { x: 6, z: 0 }, end: { x: 6, z: 4 }, height: 3, thickness: 0.2 },
      { id: '3', start: { x: 6, z: 4 }, end: { x: 0, z: 4 }, height: 3, thickness: 0.2 },
      { id: '4', start: { x: 0, z: 4 }, end: { x: 0, z: 0 }, height: 3, thickness: 0.2 },
    ],
    lshape: [
      { id: '1', start: { x: 0, z: 0 }, end: { x: 6, z: 0 }, height: 3, thickness: 0.2 },
      { id: '2', start: { x: 6, z: 0 }, end: { x: 6, z: 3 }, height: 3, thickness: 0.2 },
      { id: '3', start: { x: 6, z: 3 }, end: { x: 3, z: 3 }, height: 3, thickness: 0.2 },
      { id: '4', start: { x: 3, z: 3 }, end: { x: 3, z: 6 }, height: 3, thickness: 0.2 },
      { id: '5', start: { x: 3, z: 6 }, end: { x: 0, z: 6 }, height: 3, thickness: 0.2 },
      { id: '6', start: { x: 0, z: 6 }, end: { x: 0, z: 0 }, height: 3, thickness: 0.2 },
    ],
    triangle: [
      { id: '1', start: { x: 0, z: 0 }, end: { x: 4, z: 0 }, height: 3, thickness: 0.2 },
      { id: '2', start: { x: 4, z: 0 }, end: { x: 2, z: 3.5 }, height: 3, thickness: 0.2 },
      { id: '3', start: { x: 2, z: 3.5 }, end: { x: 0, z: 0 }, height: 3, thickness: 0.2 },
    ],
    octagon: [
      { id: '1', start: { x: 2, z: 0 }, end: { x: 4, z: 0 }, height: 3, thickness: 0.2 },
      { id: '2', start: { x: 4, z: 0 }, end: { x: 5.4, z: 1.4 }, height: 3, thickness: 0.2 },
      { id: '3', start: { x: 5.4, z: 1.4 }, end: { x: 5.4, z: 3.6 }, height: 3, thickness: 0.2 },
      { id: '4', start: { x: 5.4, z: 3.6 }, end: { x: 4, z: 5 }, height: 3, thickness: 0.2 },
      { id: '5', start: { x: 4, z: 5 }, end: { x: 2, z: 5 }, height: 3, thickness: 0.2 },
      { id: '6', start: { x: 2, z: 5 }, end: { x: 0.6, z: 3.6 }, height: 3, thickness: 0.2 },
      { id: '7', start: { x: 0.6, z: 3.6 }, end: { x: 0.6, z: 1.4 }, height: 3, thickness: 0.2 },
      { id: '8', start: { x: 0.6, z: 1.4 }, end: { x: 2, z: 0 }, height: 3, thickness: 0.2 },
    ],
    irregular: [
      { id: '1', start: { x: 0, z: 0 }, end: { x: 5, z: 0 }, height: 3, thickness: 0.2 },
      { id: '2', start: { x: 5, z: 0 }, end: { x: 7, z: 2 }, height: 3, thickness: 0.2 },
      { id: '3', start: { x: 7, z: 2 }, end: { x: 6, z: 4 }, height: 3, thickness: 0.2 },
      { id: '4', start: { x: 6, z: 4 }, end: { x: 3, z: 5 }, height: 3, thickness: 0.2 },
      { id: '5', start: { x: 3, z: 5 }, end: { x: 1, z: 3 }, height: 3, thickness: 0.2 },
      { id: '6', start: { x: 1, z: 3 }, end: { x: 0, z: 0 }, height: 3, thickness: 0.2 },
    ],
  };

  const currentWalls = demoRooms[selectedDemo];
  const metrics = AdvancedRoomCalculator.calculateRoomMetrics(currentWalls);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Advanced Room Calculator Demo
        </h1>
        <p className="text-gray-600">
          See how the advanced room calculator analyzes different room shapes
        </p>
      </div>

      {/* Room Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Select a Demo Room</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.keys(demoRooms).map((roomType) => (
            <button
              key={roomType}
              onClick={() => setSelectedDemo(roomType)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedDemo === roomType
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium capitalize">
                {roomType.replace(/([A-Z])/g, ' $1')}
              </div>
              <div className="text-sm text-gray-500">
                {demoRooms[roomType].length} walls
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Room Visualization */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Room Shape</h2>
        <div className="flex justify-center">
          <svg
            width="400"
            height="300"
            viewBox="-1 -1 8 7"
            className="border border-gray-200 rounded"
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#f0f0f0" strokeWidth="0.02"/>
              </pattern>
            </defs>
            <rect width="8" height="7" fill="url(#grid)" />
            
            {/* Walls */}
            {currentWalls.map((wall, index) => (
              <g key={wall.id}>
                <line
                  x1={wall.start.x}
                  y1={wall.start.z}
                  x2={wall.end.x}
                  y2={wall.end.z}
                  stroke="#2563eb"
                  strokeWidth="0.1"
                  strokeLinecap="round"
                />
                {/* Wall labels */}
                <text
                  x={(wall.start.x + wall.end.x) / 2}
                  y={(wall.start.z + wall.end.z) / 2 - 0.1}
                  fontSize="0.2"
                  textAnchor="middle"
                  fill="#1e40af"
                  className="font-semibold"
                >
                  {index + 1}
                </text>
              </g>
            ))}
            
            {/* Centroid */}
            <circle
              cx={metrics.centroid.x}
              cy={metrics.centroid.z}
              r="0.05"
              fill="#ef4444"
            />
            <text
              x={metrics.centroid.x + 0.2}
              y={metrics.centroid.z}
              fontSize="0.15"
              fill="#ef4444"
              className="font-medium"
            >
              Center
            </text>
          </svg>
        </div>
      </div>

      {/* Advanced Metrics */}
      <AdvancedRoomMetrics metrics={metrics} showAdvanced={true} />

      {/* Raw Data */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Raw Calculation Data</h2>
        <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
          <pre className="text-sm text-gray-700">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};