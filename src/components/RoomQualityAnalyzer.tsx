'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wall } from './Floorplan2DCanvas';

interface RoomQualityAnalyzerProps {
  walls: Wall[];
  isValid: boolean;
  area: number;
  perimeter: number;
}

interface QualityMetric {
  name: string;
  score: number;
  maxScore: number;
  description: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

const RoomQualityAnalyzer: React.FC<RoomQualityAnalyzerProps> = ({
  walls,
  isValid,
  area,
  perimeter
}) => {
  const analyzeRoomQuality = (): QualityMetric[] => {
    const metrics: QualityMetric[] = [];

    // 1. Room Shape Analysis
    const shapeScore = analyzeRoomShape();
    metrics.push({
      name: 'Room Shape',
      score: shapeScore,
      maxScore: 100,
      description: 'Evaluates room proportions and regularity',
      status: shapeScore >= 80 ? 'excellent' : shapeScore >= 60 ? 'good' : shapeScore >= 40 ? 'fair' : 'poor'
    });

    // 2. Wall Quality Analysis
    const wallScore = analyzeWallQuality();
    metrics.push({
      name: 'Wall Quality',
      score: wallScore,
      maxScore: 100,
      description: 'Checks wall lengths and angles',
      status: wallScore >= 80 ? 'excellent' : wallScore >= 60 ? 'good' : wallScore >= 40 ? 'fair' : 'poor'
    });

    // 3. Room Size Analysis
    const sizeScore = analyzeRoomSize();
    metrics.push({
      name: 'Room Size',
      score: sizeScore,
      maxScore: 100,
      description: 'Evaluates room area and usability',
      status: sizeScore >= 80 ? 'excellent' : sizeScore >= 60 ? 'good' : sizeScore >= 40 ? 'fair' : 'poor'
    });

    // 4. Structural Integrity
    const structuralScore = analyzeStructuralIntegrity();
    metrics.push({
      name: 'Structure',
      score: structuralScore,
      maxScore: 100,
      description: 'Checks for closed shape and valid topology',
      status: structuralScore >= 80 ? 'excellent' : structuralScore >= 60 ? 'good' : structuralScore >= 40 ? 'fair' : 'poor'
    });

    return metrics;
  };

  const analyzeRoomShape = (): number => {
    if (!isValid || walls.length < 3) return 0;

    // Calculate aspect ratio
    const vertices = getOrderedVertices();
    if (vertices.length < 3) return 0;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    vertices.forEach(v => {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minZ = Math.min(minZ, v.z);
      maxZ = Math.max(maxZ, v.z);
    });

    const width = maxX - minX;
    const height = maxZ - minZ;
    const aspectRatio = Math.max(width, height) / Math.min(width, height);

    // Ideal aspect ratio is between 1:1 and 2:1
    let shapeScore = 100;
    if (aspectRatio > 3) shapeScore -= 30;
    else if (aspectRatio > 2) shapeScore -= 15;

    // Check for right angles (preferred in most rooms)
    const rightAngleCount = countRightAngles();
    const rightAngleRatio = rightAngleCount / walls.length;
    shapeScore += rightAngleRatio * 20 - 10;

    return Math.max(0, Math.min(100, shapeScore));
  };

  const analyzeWallQuality = (): number => {
    if (walls.length === 0) return 0;

    let score = 100;
    let shortWallPenalty = 0;
    let longWallPenalty = 0;

    walls.forEach(wall => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.z - wall.start.z, 2)
      );

      // Penalize very short walls (< 1m)
      if (length < 1) shortWallPenalty += 10;
      
      // Penalize very long walls (> 10m) without support
      if (length > 10) longWallPenalty += 5;
    });

    score -= Math.min(shortWallPenalty, 40);
    score -= Math.min(longWallPenalty, 20);

    return Math.max(0, score);
  };

  const analyzeRoomSize = (): number => {
    if (area === 0) return 0;

    // Optimal room sizes for different purposes
    let score = 50; // Base score

    if (area >= 9 && area <= 50) {
      // Good size for most rooms (3x3m to 7x7m)
      score = 100;
    } else if (area >= 6 && area < 9) {
      // Small but usable
      score = 80;
    } else if (area > 50 && area <= 100) {
      // Large room
      score = 90;
    } else if (area < 6) {
      // Too small
      score = 30;
    } else if (area > 100) {
      // Very large, might need columns
      score = 70;
    }

    // Efficiency score (perimeter to area ratio)
    const efficiency = (4 * Math.sqrt(area)) / perimeter;
    score += (efficiency - 0.8) * 50;

    return Math.max(0, Math.min(100, score));
  };

  const analyzeStructuralIntegrity = (): number => {
    if (!isValid) return 0;

    let score = 100;

    // Check for minimum wall count
    if (walls.length < 4) score -= 20;

    // Check wall thickness consistency
    const thicknesses = walls.map(w => w.thickness);
    const avgThickness = thicknesses.reduce((a, b) => a + b, 0) / thicknesses.length;
    const thicknessVariation = Math.max(...thicknesses) - Math.min(...thicknesses);
    
    if (thicknessVariation > avgThickness * 0.5) score -= 15;

    // Check wall height consistency
    const heights = walls.map(w => w.height);
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
    const heightVariation = Math.max(...heights) - Math.min(...heights);
    
    if (heightVariation > avgHeight * 0.2) score -= 10;

    return Math.max(0, score);
  };

  const getOrderedVertices = () => {
    // Simplified vertex ordering for analysis
    const vertices: { x: number; z: number }[] = [];
    walls.forEach(wall => {
      vertices.push(wall.start, wall.end);
    });
    return vertices;
  };

  const countRightAngles = (): number => {
    if (walls.length < 3) return 0;

    let rightAngles = 0;
    for (let i = 0; i < walls.length; i++) {
      const currentWall = walls[i];
      const nextWall = walls[(i + 1) % walls.length];

      const angle1 = Math.atan2(
        currentWall.end.z - currentWall.start.z,
        currentWall.end.x - currentWall.start.x
      );
      const angle2 = Math.atan2(
        nextWall.end.z - nextWall.start.z,
        nextWall.end.x - nextWall.start.x
      );

      const angleDiff = Math.abs(angle1 - angle2);
      const normalizedAngle = Math.min(angleDiff, Math.PI * 2 - angleDiff);

      // Check if angle is close to 90 degrees (π/2)
      if (Math.abs(normalizedAngle - Math.PI / 2) < 0.1) {
        rightAngles++;
      }
    }

    return rightAngles;
  };

  const metrics = analyzeRoomQuality();
  const overallScore = metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getOverallGrade = (score: number): string => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  if (walls.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Room Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Start drawing walls to see quality analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          Room Quality
          <Badge variant="outline" className={`${getStatusColor(overallScore >= 80 ? 'excellent' : overallScore >= 60 ? 'good' : overallScore >= 40 ? 'fair' : 'poor')} text-white`}>
            {getOverallGrade(overallScore)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {metrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{metric.name}</span>
                <Badge variant="outline" className={`${getStatusColor(metric.status)} text-white text-xs`}>
                  {metric.score.toFixed(0)}/100
                </Badge>
              </div>
              <Progress value={metric.score} className="h-2" />
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Overall Score</span>
            <span className="text-lg font-bold">{overallScore.toFixed(0)}/100</span>
          </div>
          <Progress value={overallScore} className="h-3 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomQualityAnalyzer;