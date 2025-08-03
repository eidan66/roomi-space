import React from 'react';

import { RoomMetrics } from '../lib/advanced-room-calculator';

interface AdvancedRoomMetricsProps {
  metrics: RoomMetrics;
  showAdvanced?: boolean;
}

export const AdvancedRoomMetrics: React.FC<AdvancedRoomMetricsProps> = ({
  metrics,
  showAdvanced = false,
}) => {
  const formatNumber = (value: number, decimals: number = 2): string =>
    value.toFixed(decimals);

  const formatPercentage = (value: number): string => `${(value * 100).toFixed(1)}%`;

  const formatAngle = (radians: number): string =>
    `${((radians * 180) / Math.PI).toFixed(1)}°`;

  const getQualityColor = (
    value: number,
    thresholds: { good: number; fair: number },
  ): string => {
    if (value >= thresholds.good) {
      return 'text-green-600';
    }
    if (value >= thresholds.fair) {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  };

  const getValidationStatus = () => {
    if (metrics.isValid) {
      return <span className="text-green-600 font-semibold">✓ Valid</span>;
    }
    return <span className="text-red-600 font-semibold">✗ Invalid</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Room Analysis</h3>
        <div className="flex items-center gap-4">
          {getValidationStatus()}
          <span className="text-sm text-gray-600">{metrics.wallCount} walls</span>
        </div>
      </div>

      {/* Basic Measurements */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Area</h4>
          <p className="text-2xl font-bold text-blue-900">
            {formatNumber(metrics.area)}m²
          </p>
          <p className="text-sm text-blue-700">
            Usable: {formatNumber(metrics.usableArea)}m²
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Perimeter</h4>
          <p className="text-2xl font-bold text-green-900">
            {formatNumber(metrics.perimeter)}m
          </p>
          <p className="text-sm text-green-700">
            Avg wall: {formatNumber(metrics.averageWallLength)}m
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {metrics.validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">Issues Found</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {metrics.validationErrors.map((error, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advanced Metrics */}
      {showAdvanced && (
        <>
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Shape Quality</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Compactness</span>
                  <span
                    className={`font-semibold ${getQualityColor(metrics.compactness, { good: 0.7, fair: 0.5 })}`}
                  >
                    {formatPercentage(metrics.compactness)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, metrics.compactness * 100)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Convexity</span>
                  <span
                    className={`font-semibold ${getQualityColor(metrics.convexity, { good: 0.8, fair: 0.6 })}`}
                  >
                    {formatPercentage(metrics.convexity)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, metrics.convexity * 100)}%` }}
                  />
                </div>
              </div>

              {metrics.wallCount === 4 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rectangularity</span>
                    <span
                      className={`font-semibold ${getQualityColor(metrics.rectangularity, { good: 0.8, fair: 0.6 })}`}
                    >
                      {formatPercentage(metrics.rectangularity)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, metrics.rectangularity * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Aspect Ratio</span>
                  <span className="font-semibold text-gray-800">
                    {formatNumber(metrics.aspectRatio, 1)}:1
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Measurements */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Detailed Measurements</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Shortest Wall:</span>
                  <span className="font-medium">
                    {formatNumber(metrics.shortestWall)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Longest Wall:</span>
                  <span className="font-medium">
                    {formatNumber(metrics.longestWall)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Angle:</span>
                  <span className="font-medium">{formatAngle(metrics.averageAngle)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bounding Box:</span>
                  <span className="font-medium">
                    {formatNumber(metrics.boundingBox.width)}×
                    {formatNumber(metrics.boundingBox.height)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wall/Floor Ratio:</span>
                  <span className="font-medium">
                    {formatPercentage(metrics.wallToFloorRatio)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Centroid:</span>
                  <span className="font-medium">
                    ({formatNumber(metrics.centroid.x, 1)},{' '}
                    {formatNumber(metrics.centroid.z, 1)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Wall Analysis */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Wall Analysis</h4>
            <div className="space-y-2">
              {metrics.wallLengths.map((length, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Wall {index + 1}:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatNumber(length)}m</span>
                    <div className="w-16 bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-400 h-1 rounded-full"
                        style={{
                          width: `${Math.min(100, (length / metrics.longestWall) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interior Angles */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-800 mb-3">Interior Angles</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {metrics.interiorAngles.map((angle, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">Corner {index + 1}:</span>
                  <span className="font-medium">{formatAngle(angle)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
