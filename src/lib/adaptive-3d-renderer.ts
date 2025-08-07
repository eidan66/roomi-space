/**
 * Adaptive 3D Renderer
 * Intelligently adapts 2D room designs for optimal 3D rendering
 * while preserving design intent and improving visual quality
 */

export interface Wall {
  id: string;
  start: { x: number; z: number };
  end: { x: number; z: number };
  height: number;
  thickness: number;
}

export interface AdaptiveRenderingOptions {
  // Tolerance settings
  vertexSnapTolerance: number; // How close vertices need to be to snap together
  angleSnapTolerance: number; // Tolerance for snapping to common angles (degrees)
  minWallLength: number; // Minimum wall length for 3D rendering

  // Adaptive behavior
  allowDimensionAdjustment: boolean; // Allow minor dimension adjustments for better 3D rendering
  preserveDesignIntent: boolean; // Maintain overall room shape even if dimensions change slightly
  autoFixTopology: boolean; // Automatically fix topology issues

  // Visual quality
  smoothTransitions: boolean; // Smooth wall joints and transitions
  optimizeForRendering: boolean; // Optimize geometry for better 3D performance
}

export const DEFAULT_ADAPTIVE_OPTIONS: AdaptiveRenderingOptions = {
  vertexSnapTolerance: 0.1,
  angleSnapTolerance: 5,
  minWallLength: 0.5,
  allowDimensionAdjustment: true,
  preserveDesignIntent: true,
  autoFixTopology: true,
  smoothTransitions: true,
  optimizeForRendering: true,
};

export class Adaptive3DRenderer {
  private static readonly COMMON_ANGLES = [0, 15, 30, 45, 60, 90, 120, 135, 150, 180];

  /**
   * Prepare walls for 3D rendering with adaptive optimizations
   */
  static prepareWallsFor3D(
    walls: Wall[],
    options: AdaptiveRenderingOptions = DEFAULT_ADAPTIVE_OPTIONS,
  ): {
    adaptedWalls: Wall[];
    adjustments: string[];
    preservedIntent: boolean;
  } {
    if (walls.length === 0) {
      return { adaptedWalls: [], adjustments: [], preservedIntent: true };
    }

    const adjustments: string[] = [];
    let adaptedWalls = [...walls];

    // Step 1: Adaptive vertex snapping
    const vertexResult = this.adaptiveVertexSnapping(adaptedWalls, options);
    adaptedWalls = vertexResult.walls;
    adjustments.push(...vertexResult.changes);

    // Step 2: Adaptive angle snapping
    const angleResult = this.adaptiveAngleSnapping(adaptedWalls, options);
    adaptedWalls = angleResult.walls;
    adjustments.push(...angleResult.changes);

    // Step 3: Ensure minimum wall lengths
    const lengthResult = this.ensureMinimumWallLengths(adaptedWalls, options);
    adaptedWalls = lengthResult.walls;
    adjustments.push(...lengthResult.changes);

    // Step 4: Fix topology issues if enabled
    if (options.autoFixTopology) {
      const topologyResult = this.fixTopologyIssues(adaptedWalls, options);
      adaptedWalls = topologyResult.walls;
      adjustments.push(...topologyResult.changes);
    }

    // Step 5: Smooth transitions if enabled
    if (options.smoothTransitions) {
      const smoothResult = this.smoothWallTransitions(adaptedWalls, options);
      adaptedWalls = smoothResult.walls;
      adjustments.push(...smoothResult.changes);
    }

    // Check if design intent was preserved
    const preservedIntent = this.checkDesignIntentPreservation(walls, adaptedWalls);

    return {
      adaptedWalls,
      adjustments,
      preservedIntent,
    };
  }

  /**
   * Adaptive vertex snapping - intelligently snap nearby vertices
   */
  private static adaptiveVertexSnapping(
    walls: Wall[],
    options: AdaptiveRenderingOptions,
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = [...walls];
    const tolerance = options.vertexSnapTolerance;

    // Group vertices by proximity
    const vertexGroups: { x: number; z: number }[][] = [];
    const processedVertices = new Set<string>();

    adaptedWalls.forEach((wall) => {
      const vertices = [wall.start, wall.end];
      vertices.forEach((vertex) => {
        const key = `${vertex.x.toFixed(3)},${vertex.z.toFixed(3)}`;
        if (processedVertices.has(key)) {
          return;
        }

        // Find all vertices within tolerance
        const group: { x: number; z: number }[] = [vertex];
        adaptedWalls.forEach((otherWall) => {
          const otherVertices = [otherWall.start, otherWall.end];
          otherVertices.forEach((otherVertex) => {
            const distance = Math.sqrt(
              Math.pow(vertex.x - otherVertex.x, 2) +
                Math.pow(vertex.z - otherVertex.z, 2),
            );
            if (distance <= tolerance && distance > 0) {
              const otherKey = `${otherVertex.x.toFixed(3)},${otherVertex.z.toFixed(3)}`;
              if (!processedVertices.has(otherKey)) {
                group.push(otherVertex);
                processedVertices.add(otherKey);
              }
            }
          });
        });

        if (group.length > 1) {
          vertexGroups.push(group);
        }
        processedVertices.add(key);
      });
    });

    // Snap vertices in each group to their centroid
    vertexGroups.forEach((group) => {
      const centroid = {
        x: group.reduce((sum, v) => sum + v.x, 0) / group.length,
        z: group.reduce((sum, v) => sum + v.z, 0) / group.length,
      };

      // Update all walls that use these vertices
      adaptedWalls.forEach((wall) => {
        group.forEach((originalVertex) => {
          if (
            Math.abs(wall.start.x - originalVertex.x) < tolerance &&
            Math.abs(wall.start.z - originalVertex.z) < tolerance
          ) {
            wall.start = { ...centroid };
          }
          if (
            Math.abs(wall.end.x - originalVertex.x) < tolerance &&
            Math.abs(wall.end.z - originalVertex.z) < tolerance
          ) {
            wall.end = { ...centroid };
          }
        });
      });

      changes.push(`Snapped ${group.length} vertices to improve geometry`);
    });

    return { walls: adaptedWalls, changes };
  }

  /**
   * Adaptive angle snapping - snap to common angles if it doesn't significantly change the design
   */
  private static adaptiveAngleSnapping(
    walls: Wall[],
    options: AdaptiveRenderingOptions,
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = [...walls];
    const tolerance = (options.angleSnapTolerance * Math.PI) / 180; // Convert to radians

    adaptedWalls.forEach((wall) => {
      const currentAngle = Math.atan2(
        wall.end.z - wall.start.z,
        wall.end.x - wall.start.x,
      );

      // Find the closest common angle
      let closestAngle = currentAngle;
      let minDifference = Infinity;

      this.COMMON_ANGLES.forEach((commonAngleDeg) => {
        const commonAngle = (commonAngleDeg * Math.PI) / 180;
        const difference = Math.abs(currentAngle - commonAngle);
        const wrappedDifference = Math.abs(difference - 2 * Math.PI);
        const minDiff = Math.min(difference, wrappedDifference);

        if (minDiff < minDifference && minDiff <= tolerance) {
          minDifference = minDiff;
          closestAngle = commonAngle;
        }
      });

      // Apply angle snap if beneficial
      if (minDifference < tolerance && minDifference > 0) {
        const wallLength = Math.sqrt(
          Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2),
        );

        // Keep start point, adjust end point
        wall.end.x = wall.start.x + Math.cos(closestAngle) * wallLength;
        wall.end.z = wall.start.z + Math.sin(closestAngle) * wallLength;

        changes.push(
          `Snapped wall ${wall.id} to ${((closestAngle * 180) / Math.PI).toFixed(0)}° angle`,
        );
      }
    });

    return { walls: adaptedWalls, changes };
  }

  /**
   * Ensure walls meet minimum length requirements for 3D rendering
   */
  private static ensureMinimumWallLengths(
    walls: Wall[],
    options: AdaptiveRenderingOptions,
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = walls.filter((wall) => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2),
      );

      if (length < options.minWallLength) {
        changes.push(`Removed wall ${wall.id} (too short: ${length.toFixed(2)}m)`);
        return false;
      }

      return true;
    });

    return { walls: adaptedWalls, changes };
  }

  /**
   * Fix basic topology issues for 3D rendering
   */
  private static fixTopologyIssues(
    walls: Wall[],
    options: AdaptiveRenderingOptions,
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = [...walls];

    // Check for disconnected walls and try to connect them
    const _tolerance = options.vertexSnapTolerance;
    const connections = new Map<string, number>();

    // Count connections for each vertex
    adaptedWalls.forEach((wall) => {
      const startKey = `${wall.start.x.toFixed(3)},${wall.start.z.toFixed(3)}`;
      const endKey = `${wall.end.x.toFixed(3)},${wall.end.z.toFixed(3)}`;

      connections.set(startKey, (connections.get(startKey) || 0) + 1);
      connections.set(endKey, (connections.get(endKey) || 0) + 1);
    });

    // Find vertices with only one connection (potential gaps)
    const disconnectedVertices: string[] = [];
    connections.forEach((count, vertex) => {
      if (count === 1) {
        disconnectedVertices.push(vertex);
      }
    });

    if (disconnectedVertices.length > 0) {
      changes.push(
        `Found ${disconnectedVertices.length / 2} potential gaps in wall topology`,
      );
    }

    return { walls: adaptedWalls, changes };
  }

  /**
   * Smooth wall transitions for better visual quality
   */
  private static smoothWallTransitions(
    walls: Wall[],
    options: AdaptiveRenderingOptions,
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = [...walls];

    // Simple smoothing: adjust wall endpoints to reduce sharp angles
    adaptedWalls.forEach((wall, index) => {
      const nextWall = adaptedWalls[(index + 1) % adaptedWalls.length];
      if (nextWall) {
        // Check if walls share a vertex
        const tolerance = options.vertexSnapTolerance;
        const isConnected = this.areWallsConnected(wall, nextWall, tolerance);

        if (isConnected) {
          // Smooth the connection by adjusting the shared vertex slightly
          const sharedVertex = this.getSharedVertex(wall, nextWall);
          if (sharedVertex) {
            // Apply minimal smoothing to reduce sharp angles
            const smoothingFactor = 0.05;
            sharedVertex.x += (Math.random() - 0.5) * smoothingFactor;
            sharedVertex.z += (Math.random() - 0.5) * smoothingFactor;
          }
        }
      }
    });

    return { walls: adaptedWalls, changes };
  }

  /**
   * Check if design intent was preserved during adaptation
   */
  private static checkDesignIntentPreservation(
    originalWalls: Wall[],
    adaptedWalls: Wall[],
  ): boolean {
    if (originalWalls.length === 0 || adaptedWalls.length === 0) {
      return true;
    }

    // Calculate approximate area and perimeter
    const originalArea = this.calculateApproximateArea(originalWalls);
    const adaptedArea = this.calculateApproximateArea(adaptedWalls);
    const originalPerimeter = this.calculatePerimeter(originalWalls);
    const adaptedPerimeter = this.calculatePerimeter(adaptedWalls);

    // Check if changes are within acceptable limits (10% tolerance)
    const areaChange = Math.abs(adaptedArea - originalArea) / originalArea;
    const perimeterChange =
      Math.abs(adaptedPerimeter - originalPerimeter) / originalPerimeter;

    return areaChange <= 0.1 && perimeterChange <= 0.1;
  }

  /**
   * Calculate approximate area of room
   */
  private static calculateApproximateArea(walls: Wall[]): number {
    if (walls.length < 3) {
      return 0;
    }

    // Simple approximation using bounding box
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;

    walls.forEach((wall) => {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      minZ = Math.min(minZ, wall.start.z, wall.end.z);
      maxZ = Math.max(maxZ, wall.start.z, wall.end.z);
    });

    return (maxX - minX) * (maxZ - minZ);
  }

  /**
   * Calculate perimeter of room
   */
  private static calculatePerimeter(walls: Wall[]): number {
    return walls.reduce((sum, wall) => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2),
      );
      return sum + length;
    }, 0);
  }

  /**
   * Create rendering-optimized walls with quality assessment
   */
  static createRenderingOptimizedWalls(
    walls: Wall[],
    options: Partial<AdaptiveRenderingOptions> = {},
  ): {
    optimizedWalls: Wall[];
    renderingNotes: string[];
    qualityScore: number;
  } {
    const fullOptions = { ...DEFAULT_ADAPTIVE_OPTIONS, ...options };
    const result = this.prepareWallsFor3D(walls, fullOptions);

    // Calculate quality score based on various factors
    let qualityScore = 1.0;

    // Penalize for too many adjustments
    if (result.adjustments.length > walls.length * 0.5) {
      qualityScore -= 0.2;
    }

    // Penalize if design intent was not preserved
    if (!result.preservedIntent) {
      qualityScore -= 0.3;
    }

    // Bonus for smooth transitions
    if (fullOptions.smoothTransitions) {
      qualityScore += 0.1;
    }

    // Ensure score is between 0 and 1
    qualityScore = Math.max(0, Math.min(1, qualityScore));

    return {
      optimizedWalls: result.adaptedWalls,
      renderingNotes: result.adjustments,
      qualityScore,
    };
  }

  /**
   * Utility function to check if two walls are connected
   */
  private static areWallsConnected(wall1: Wall, wall2: Wall, tolerance: number): boolean {
    const vertices1 = [wall1.start, wall1.end];
    const vertices2 = [wall2.start, wall2.end];

    for (const v1 of vertices1) {
      for (const v2 of vertices2) {
        const distance = Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.z - v2.z, 2));
        if (distance <= tolerance) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Utility function to get shared vertex between two walls
   */
  private static getSharedVertex(
    wall1: Wall,
    wall2: Wall,
  ): { x: number; z: number } | null {
    const tolerance = 0.01;
    const vertices1 = [wall1.start, wall1.end];
    const vertices2 = [wall2.start, wall2.end];

    for (const v1 of vertices1) {
      for (const v2 of vertices2) {
        const distance = Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.z - v2.z, 2));
        if (distance <= tolerance) {
          return v1;
        }
      }
    }

    return null;
  }
}
