import React from 'react';

import { AdvancedRoomCalculator, Wall } from '../lib/advanced-room-calculator';

/**
 * Simple test component to verify the Advanced Room Calculator is working
 */
export const RoomCalculatorTest: React.FC = () => {
  // Test with a simple rectangular room
  const testWalls: Wall[] = [
    { id: '1', start: { x: 0, z: 0 }, end: { x: 6, z: 0 }, height: 3, thickness: 0.2 },
    { id: '2', start: { x: 6, z: 0 }, end: { x: 6, z: 4 }, height: 3, thickness: 0.2 },
    { id: '3', start: { x: 6, z: 4 }, end: { x: 0, z: 4 }, height: 3, thickness: 0.2 },
    { id: '4', start: { x: 0, z: 4 }, end: { x: 0, z: 0 }, height: 3, thickness: 0.2 },
  ];

  const metrics = AdvancedRoomCalculator.calculateRoomMetrics(testWalls);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Room Calculator Test</h3>
      <div className="space-y-1 text-sm">
        <p>Valid: {metrics.isValid ? '✅' : '❌'}</p>
        <p>Area: {metrics.area.toFixed(2)}m²</p>
        <p>Perimeter: {metrics.perimeter.toFixed(2)}m</p>
        <p>Compactness: {(metrics.compactness * 100).toFixed(1)}%</p>
        <p>Wall Count: {metrics.wallCount}</p>
        {metrics.validationErrors.length > 0 && (
          <div className="text-red-600">
            <p>Errors:</p>
            <ul className="list-disc list-inside">
              {metrics.validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
