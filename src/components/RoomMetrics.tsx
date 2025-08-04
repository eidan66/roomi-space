'use client';

import React from 'react';

import { Building, Ruler, Square } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RoomMetrics } from '@/lib/advanced-room-calculator';

interface RoomMetricsProps {
  metrics: RoomMetrics;
}

export default function RoomMetrics({ metrics }: RoomMetricsProps) {
  if (!metrics.isValid) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 lg:pb-3">
          <CardTitle className="text-base lg:text-lg flex items-center">
            <Ruler className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            Room Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {metrics.validationErrors.length > 0 ? (
              <div className="space-y-2">
                <p className="font-medium text-destructive">Invalid Room</p>
                <ul className="text-xs space-y-1">
                  {metrics.validationErrors.slice(0, 3).map((error, index) => (
                    <li key={index} className="text-destructive">
                      • {error}
                    </li>
                  ))}
                  {metrics.validationErrors.length > 3 && (
                    <li className="text-muted-foreground">
                      • +{metrics.validationErrors.length - 3} more issues
                    </li>
                  )}
                </ul>
              </div>
            ) : (
              <p>Draw walls to see room metrics</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 lg:pb-3">
        <CardTitle className="text-base lg:text-lg flex items-center">
          <Ruler className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
          Room Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Basic Measurements */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Square className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Area</p>
              <p className="text-lg font-bold text-blue-600">
                {metrics.area.toFixed(1)} m²
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Ruler className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm font-medium">Perimeter</p>
              <p className="text-lg font-bold text-green-600">
                {metrics.perimeter.toFixed(1)} m
              </p>
            </div>
          </div>
        </div>

        {/* Wall Information */}
        <div className="flex items-center space-x-2">
          <Building className="w-4 h-4 text-purple-600" />
          <div className="flex-1">
            <p className="text-sm font-medium">Walls</p>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-purple-600">
                {metrics.wallCount}
              </span>
              <span className="text-xs text-muted-foreground">
                (avg: {metrics.averageWallLength.toFixed(1)}m)
              </span>
            </div>
          </div>
        </div>

        {/* Room Shape Quality */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Room Quality</p>
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={metrics.rectangularity > 0.8 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {metrics.rectangularity > 0.8 ? '✓' : '○'} Rectangular
            </Badge>
            <Badge
              variant={metrics.convexity > 0.9 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {metrics.convexity > 0.9 ? '✓' : '○'} Convex
            </Badge>
            <Badge
              variant={metrics.compactness > 0.6 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {metrics.compactness > 0.6 ? '✓' : '○'} Compact
            </Badge>
          </div>
        </div>

        {/* Usable Area */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Usable Area</span>
            <span className="text-sm font-bold text-blue-600">
              {metrics.usableArea.toFixed(1)} m²
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Wall Ratio</span>
            <span className="text-xs text-muted-foreground">
              {(metrics.wallToFloorRatio * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
