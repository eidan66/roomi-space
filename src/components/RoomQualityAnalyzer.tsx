'use client';

import React from 'react';

import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { RoomMetrics } from '../lib/advanced-room-calculator';

interface RoomQualityAnalyzerProps {
  metrics: RoomMetrics;
}

interface QualityMetric {
  name: string;
  score: number;
  maxScore: number;
  description: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

const RoomQualityAnalyzer: React.FC<RoomQualityAnalyzerProps> = ({ metrics }) => {
  const { t } = useTranslation();

  // Safety check to prevent errors if metrics is undefined
  if (!metrics) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('roomQuality.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            {t('roomQuality.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const analyzeRoomQuality = (): QualityMetric[] => {
    const qualityMetrics: QualityMetric[] = [];

    // 1. Shape Quality (based on compactness and convexity)
    const shapeScore = Math.min(100, metrics.compactness * 50 + metrics.convexity * 50);
    qualityMetrics.push({
      name: t('qualityMetrics.shapeQuality.name'),
      score: shapeScore,
      maxScore: 100,
      description: t('qualityMetrics.shapeQuality.description'),
      status: (() => {
        if (shapeScore >= 80) {
          return 'excellent';
        }
        if (shapeScore >= 60) {
          return 'good';
        }
        if (shapeScore >= 40) {
          return 'fair';
        }
        return 'poor';
      })(),
    });

    // 2. Geometric Regularity (rectangularity for 4-wall rooms)
    let regularityScore = 50; // Base score
    if (metrics.wallCount === 4) {
      regularityScore = metrics.rectangularity * 100;
    } else {
      // For non-rectangular rooms, use angle consistency
      const idealAngle = (2 * Math.PI) / metrics.wallCount;
      const angleVariance =
        metrics.interiorAngles.reduce(
          (sum, angle) => sum + Math.abs(angle - idealAngle),
          0,
        ) / metrics.wallCount;
      regularityScore = Math.max(0, 100 - angleVariance * 100);
    }

    qualityMetrics.push({
      name: t('qualityMetrics.regularity.name'),
      score: regularityScore,
      maxScore: 100,
      description:
        metrics.wallCount === 4
          ? t('qualityMetrics.regularity.description')
          : t('qualityMetrics.regularity.descriptionAlt'),
      status: (() => {
        if (regularityScore >= 80) {
          return 'excellent';
        }
        if (regularityScore >= 60) {
          return 'good';
        }
        if (regularityScore >= 40) {
          return 'fair';
        }
        return 'poor';
      })(),
    });

    // 3. Size Appropriateness
    const sizeScore = analyzeSizeQuality();
    qualityMetrics.push({
      name: t('qualityMetrics.sizeQuality.name'),
      score: sizeScore,
      maxScore: 100,
      description: t('qualityMetrics.sizeQuality.description'),
      status: (() => {
        if (sizeScore >= 80) {
          return 'excellent';
        }
        if (sizeScore >= 60) {
          return 'good';
        }
        if (sizeScore >= 40) {
          return 'fair';
        }
        return 'poor';
      })(),
    });

    // 4. Construction Feasibility
    const constructionScore = analyzeConstructionFeasibility();
    qualityMetrics.push({
      name: t('qualityMetrics.construction.name'),
      score: constructionScore,
      maxScore: 100,
      description: t('qualityMetrics.construction.description'),
      status: (() => {
        if (constructionScore >= 80) {
          return 'excellent';
        }
        if (constructionScore >= 60) {
          return 'good';
        }
        if (constructionScore >= 40) {
          return 'fair';
        }
        return 'poor';
      })(),
    });

    // 5. Space Efficiency
    const efficiencyScore = (1 - metrics.wallToFloorRatio) * 100;
    qualityMetrics.push({
      name: t('qualityMetrics.efficiency.name'),
      score: Math.min(100, efficiencyScore),
      maxScore: 100,
      description: t('qualityMetrics.efficiency.description'),
      status: (() => {
        if (efficiencyScore >= 80) {
          return 'excellent';
        }
        if (efficiencyScore >= 60) {
          return 'good';
        }
        if (efficiencyScore >= 40) {
          return 'fair';
        }
        return 'poor';
      })(),
    });

    return qualityMetrics;
  };

  const analyzeSizeQuality = (): number => {
    if (metrics.area === 0) {
      return 0;
    }

    let score = 50; // Base score

    // Optimal room sizes for different purposes
    if (metrics.area >= 9 && metrics.area <= 50) {
      // Good size for most rooms (3x3m to 7x7m)
      score = 100;
    } else if (metrics.area >= 6 && metrics.area < 9) {
      // Small but usable
      score = 80;
    } else if (metrics.area > 50 && metrics.area <= 100) {
      // Large room
      score = 90;
    } else if (metrics.area < 6) {
      // Too small
      score = 30;
    } else if (metrics.area > 100) {
      // Very large, might need columns
      score = 70;
    }

    // Aspect ratio penalty
    if (metrics.aspectRatio > 3) {
      score -= 20;
    } else if (metrics.aspectRatio > 2) {
      score -= 10;
    }

    // Compactness bonus
    score += metrics.compactness * 20;

    return Math.max(0, Math.min(100, score));
  };

  const analyzeConstructionFeasibility = (): number => {
    if (!metrics.isValid) {
      return 0;
    }

    let score = 100;

    // Penalize very short walls (< 1m)
    const shortWalls = metrics.wallLengths.filter((length) => length < 1).length;
    score -= shortWalls * 15;

    // Penalize very long walls (> 10m) without support
    const longWalls = metrics.wallLengths.filter((length) => length > 10).length;
    score -= longWalls * 10;

    // Check for extreme angles
    const extremeAngles = metrics.interiorAngles.filter((angle) => {
      const degrees = (angle * 180) / Math.PI;
      return degrees < 30 || degrees > 330;
    }).length;
    score -= extremeAngles * 20;

    // Bonus for regular angles (multiples of 15 degrees)
    const regularAngles = metrics.interiorAngles.filter((angle) => {
      const degrees = (angle * 180) / Math.PI;
      return degrees % 15 < 2 || degrees % 15 > 13;
    }).length;
    score += (regularAngles / metrics.interiorAngles.length) * 10;

    return Math.max(0, score);
  };

  const qualityMetrics = analyzeRoomQuality();
  const overallScore =
    qualityMetrics.reduce((sum, metric) => sum + metric.score, 0) / qualityMetrics.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getOverallGrade = (score: number): string => {
    if (score >= 90) {
      return 'A+';
    }
    if (score >= 80) {
      return 'A';
    }
    if (score >= 70) {
      return 'B';
    }
    if (score >= 60) {
      return 'C';
    }
    if (score >= 50) {
      return 'D';
    }
    return 'F';
  };

  if (metrics.wallCount === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('roomQuality.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            {t('roomQuality.startDrawing')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          {t('roomQuality.title')}
          <Badge
            variant="outline"
            className={`${getStatusColor(
              (() => {
                if (overallScore >= 80) {
                  return 'excellent';
                }
                if (overallScore >= 60) {
                  return 'good';
                }
                if (overallScore >= 40) {
                  return 'fair';
                }
                return 'poor';
              })(),
            )} text-white`}
          >
            {getOverallGrade(overallScore)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {qualityMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{metric.name}</span>
                <Badge
                  variant="outline"
                  className={`${getStatusColor(metric.status)} text-white text-xs`}
                >
                  {metric.score.toFixed(0)}/100
                </Badge>
              </div>
              <Progress value={metric.score} className="h-2" />
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>

        {/* Show validation errors if any */}
        {metrics.validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-semibold text-red-800 mb-2">
              {t('roomQuality.issuesFound')}
            </h4>
            <ul className="text-xs text-red-700 space-y-1">
              {metrics.validationErrors.map((error, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-red-500 mt-0.5">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">{t('roomQuality.overallScore')}</span>
            <span className="text-lg font-bold">{overallScore.toFixed(0)}/100</span>
          </div>
          <Progress value={overallScore} className="h-3 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomQualityAnalyzer;
