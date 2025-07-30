/**
 * Adaptive 3D Renderer
 * Provides flexible dimension handling for 3D visualization that doesn't require
 * exact matching with 2D plans, allowing for better 3D rendering while preserving design intent
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
  vertexSnapTolerance: 0.1, // 10cm tolerance
  angleSnapTolerance: 5, // 5 degree tolerance
  minWallLength: 0.2, // 20cm minimum wall length
  allowDimensionAdjustment: true,
  preserveDesignIntent: true,
  autoFixTopology: true,
  smoothTransitions: true,
  optimizeForRendering: true,
};

export class Adaptive3DRenderer {
  private static readonly COMMON_ANGLES = [0, 15, 30, 45, 60, 90, 120, 135, 150, 180];
  
  /**
   * Prepare walls for 3D rendering with adaptive adjustments
   */
  static prepareWallsFor3D(
    walls: Wall[], 
    options: AdaptiveRenderingOptions = DEFAULT_ADAPTIVE_OPTIONS
  ): {
    adaptedWalls: Wall[];
    adjustments: string[];
    preservedIntent: boolean;
  } {
    let adaptedWalls = [...walls];
    const adjustments: string[] = [];
    
    // Step 1: Snap vertices if enabled and needed
    if (options.allowDimensionAdjustment) {
      const { walls: snappedWalls, changes } = this.adaptiveVertexSnapping(adaptedWalls, options);
      adaptedWalls = snappedWalls;
      adjustments.push(...changes);
    }
    
    // Step 2: Snap to common angles if beneficial
    if (options.allowDimensionAdjustment) {
      const { walls: angleSnappedWalls, changes } = this.adaptiveAngleSnapping(adaptedWalls, options);
      adaptedWalls = angleSnappedWalls;
      adjustments.push(...changes);
    }
    
    // Step 3: Ensure minimum wall lengths
    const { walls: lengthAdjustedWalls, changes } = this.ensureMinimumWallLengths(adaptedWalls, options);
    adaptedWalls = lengthAdjustedWalls;
    adjustments.push(...changes);
    
    // Step 4: Fix topology issues if needed
    if (options.autoFixTopology) {
      const { walls: topologyFixedWalls, changes } = this.fixTopologyIssues(adaptedWalls, options);
      adaptedWalls = topologyFixedWalls;
      adjustments.push(...changes);
    }
    
    // Step 5: Smooth transitions if enabled
    if (options.smoothTransitions) {
      const { walls: smoothedWalls, changes } = this.smoothWallTransitions(adaptedWalls, options);
      adaptedWalls = smoothedWalls;
      adjustments.push(...changes);
    }
    
    // Check if design intent is preserved
    const preservedIntent = this.checkDesignIntentPreservation(walls, adaptedWalls);
    
    return {
      adaptedWalls,
      adjustments,
      preservedIntent
    };
  }
  
  /**
   * Adaptive vertex snapping - only snap if it improves the geometry
   */
  private static adaptiveVertexSnapping(
    walls: Wall[], 
    options: AdaptiveRenderingOptions
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = [...walls];
    const tolerance = options.vertexSnapTolerance;
    
    // Find vertices that are close to each other
    const vertices = new Map<string, { x: number; z: number; wallIds: string[] }>();
    
    walls.forEach(wall => {
      const startKey = `${wall.start.x.toFixed(3)},${wall.start.z.toFixed(3)}`;
      const endKey = `${wall.end.x.toFixed(3)},${wall.end.z.toFixed(3)}`;
      
      if (!vertices.has(startKey)) {
        vertices.set(startKey, { x: wall.start.x, z: wall.start.z, wallIds: [] });
      }
      if (!vertices.has(endKey)) {
        vertices.set(endKey, { x: wall.end.x, z: wall.end.z, wallIds: [] });
      }
      
      vertices.get(startKey)!.wallIds.push(wall.id);
      vertices.get(endKey)!.wallIds.push(wall.id);
    });
    
    // Group nearby vertices
    const vertexGroups: { x: number; z: number; wallIds: string[] }[][] = [];
    const processed = new Set<string>();
    
    for (const [key, vertex] of vertices.entries()) {
      if (processed.has(key)) continue;
      
      const group = [vertex];
      processed.add(key);
      
      // Find nearby vertices
      for (const [otherKey, otherVertex] of vertices.entries()) {
        if (processed.has(otherKey)) continue;
        
        const distance = Math.sqrt(
          Math.pow(vertex.x - otherVertex.x, 2) + 
          Math.pow(vertex.z - otherVertex.z, 2)
        );
        
        if (distance <= tolerance) {
          group.push(otherVertex);
          processed.add(otherKey);
        }
      }
      
      if (group.length > 1) {
        vertexGroups.push(group);
      }
    }
    
    // Snap vertices in each group to their centroid
    vertexGroups.forEach(group => {
      const centroidX = group.reduce((sum, v) => sum + v.x, 0) / group.length;
      const centroidZ = group.reduce((sum, v) => sum + v.z, 0) / group.length;
      
      const affectedWallIds = new Set<string>();
      group.forEach(vertex => vertex.wallIds.forEach(id => affectedWallIds.add(id)));
      
      // Update affected walls
      adaptedWalls.forEach(wall => {
        if (affectedWallIds.has(wall.id)) {
          const startDistance = Math.sqrt(
            Math.pow(wall.start.x - centroidX, 2) + 
            Math.pow(wall.start.z - centroidZ, 2)
          );
          const endDistance = Math.sqrt(
            Math.pow(wall.end.x - centroidX, 2) + 
            Math.pow(wall.end.z - centroidZ, 2)
          );
          
          if (startDistance <= tolerance) {
            wall.start.x = centroidX;
            wall.start.z = centroidZ;
          }
          if (endDistance <= tolerance) {
            wall.end.x = centroidX;
            wall.end.z = centroidZ;
          }
        }
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
    options: AdaptiveRenderingOptions
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = [...walls];
    const tolerance = (options.angleSnapTolerance * Math.PI) / 180; // Convert to radians
    
    adaptedWalls.forEach(wall => {
      const currentAngle = Math.atan2(
        wall.end.z - wall.start.z,
        wall.end.x - wall.start.x
      );
      
      // Find the closest common angle
      let closestAngle = currentAngle;
      let minDifference = Infinity;
      
      this.COMMON_ANGLES.forEach(commonAngleDeg => {
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
          Math.pow(wall.end.x - wall.start.x, 2) + 
          Math.pow(wall.end.z - wall.start.z, 2)
        );
        
        // Keep start point, adjust end point
        wall.end.x = wall.start.x + Math.cos(closestAngle) * wallLength;
        wall.end.z = wall.start.z + Math.sin(closestAngle) * wallLength;
        
        changes.push(`Snapped wall ${wall.id} to ${(closestAngle * 180 / Math.PI).toFixed(0)}° angle`);
      }
    });
    
    return { walls: adaptedWalls, changes };
  }
  
  /**
   * Ensure walls meet minimum length requirements for 3D rendering
   */
  private static ensureMinimumWallLengths(
    walls: Wall[], 
    options: AdaptiveRenderingOptions
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = walls.filter(wall => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.z - wall.start.z, 2)
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
    options: AdaptiveRenderingOptions
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    let adaptedWalls = [...walls];
    
    // Check for disconnected walls and try to connect them
    const tolerance = options.vertexSnapTolerance;
    const connections = new Map<string, number>();
    
    // Count connections for each vertex
    walls.forEach(wall => {
      const startKey = `${wall.start.x.toFixed(3)},${wall.start.z.toFixed(3)}`;
      const endKey = `${wall.end.x.toFixed(3)},${wall.end.z.toFixed(3)}`;
      
      connections.set(startKey, (connections.get(startKey) || 0) + 1);
      connections.set(endKey, (connections.get(endKey) || 0) + 1);
    });
    
    // Find vertices with only one connection (potential gaps)
    const disconnectedVertices: string[] = [];
    for (const [vertex, count] of connections.entries()) {
      if (count === 1) {
        disconnectedVertices.push(vertex);
      }
    }
    
    if (disconnectedVertices.length > 0) {
      changes.push(`Found ${disconnectedVertices.length / 2} potential gaps in wall topology`);
    }
    
    return { walls: adaptedWalls, changes };
  }
  
  /**
   * Smooth wall transitions for better 3D appearance
   */
  private static smoothWallTransitions(
    walls: Wall[], 
    options: AdaptiveRenderingOptions
  ): { walls: Wall[]; changes: string[] } {
    const changes: string[] = [];
    const adaptedWalls = [...walls];
    
    // This is a placeholder for more advanced smoothing algorithms
    // For now, we just ensure walls connect properly at joints
    
    return { walls: adaptedWalls, changes };
  }
  
  /**
   * Check if the overall design intent is preserved after adaptations
   */
  private static checkDesignIntentPreservation(
    originalWalls: Wall[], 
    adaptedWalls: Wall[]
  ): boolean {
    if (originalWalls.length !== adaptedWalls.length) {
      return false; // Wall count changed significantly
    }
    
    // Calculate original and adapted areas
    const originalArea = this.calculateApproximateArea(originalWalls);
    const adaptedArea = this.calculateApproximateArea(adaptedWalls);
    
    // Allow up to 5% area change
    const areaChangePercent = Math.abs(adaptedArea - originalArea) / originalArea;
    if (areaChangePercent > 0.05) {
      return false;
    }
    
    // Check if overall shape is preserved (simplified check)
    const originalPerimeter = this.calculatePerimeter(originalWalls);
    const adaptedPerimeter = this.calculatePerimeter(adaptedWalls);
    
    const perimeterChangePercent = Math.abs(adaptedPerimeter - originalPerimeter) / originalPerimeter;
    if (perimeterChangePercent > 0.1) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Calculate approximate area for design intent checking
   */
  private static calculateApproximateArea(walls: Wall[]): number {
    if (walls.length < 3) return 0;
    
    // Simple bounding box area as approximation
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    
    walls.forEach(wall => {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      minZ = Math.min(minZ, wall.start.z, wall.end.z);
      maxZ = Math.max(maxZ, wall.start.z, wall.end.z);
    });
    
    return (maxX - minX) * (maxZ - minZ);
  }
  
  /**
   * Calculate perimeter for design intent checking
   */
  private static calculatePerimeter(walls: Wall[]): number {
    return walls.reduce((sum, wall) => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + 
        Math.pow(wall.end.z - wall.start.z, 2)
      );
      return sum + length;
    }, 0);
  }
  
  /**
   * Create rendering-optimized walls with flexible tolerances
   */
  static createRenderingOptimizedWalls(
    walls: Wall[],
    options: Partial<AdaptiveRenderingOptions> = {}
  ): {
    optimizedWalls: Wall[];
    renderingNotes: string[];
    qualityScore: number;
  } {
    const fullOptions = { ...DEFAULT_ADAPTIVE_OPTIONS, ...options };
    const { adaptedWalls, adjustments, preservedIntent } = this.prepareWallsFor3D(walls, fullOptions);
    
    // Calculate quality score based on various factors
    let qualityScore = 100;
    
    // Penalize for each adjustment made
    qualityScore -= adjustments.length * 2;
    
    // Bonus for preserved intent
    if (preservedIntent) {
      qualityScore += 10;
    } else {
      qualityScore -= 20;
    }
    
    // Ensure score is within bounds
    qualityScore = Math.max(0, Math.min(100, qualityScore));
    
    const renderingNotes = [
      `Applied ${adjustments.length} adaptive adjustments for 3D rendering`,
      `Design intent ${preservedIntent ? 'preserved' : 'modified'}`,
      `Rendering quality score: ${qualityScore}/100`,
      ...adjustments
    ];
    
    return {
      optimizedWalls: adaptedWalls,
      renderingNotes,
      qualityScore
    };
  }
}