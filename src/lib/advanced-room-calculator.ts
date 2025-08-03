/**
 * Advanced Room Calculator
 * Provides comprehensive room analysis including area, perimeter, shape metrics,
 * and geometric validation with support for complex polygons
 */

export interface Point {
  x: number;
  z: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  height: number;
  thickness: number;
}

export interface RoomMetrics {
  // Basic measurements
  area: number;
  perimeter: number;
  wallCount: number;

  // Advanced metrics
  compactness: number; // How close to a circle (1 = perfect circle)
  rectangularity: number; // How close to a rectangle (1 = perfect rectangle)
  convexity: number; // How convex the shape is (1 = fully convex)
  aspectRatio: number; // Width to height ratio

  // Geometric properties
  centroid: Point;
  boundingBox: {
    min: Point;
    max: Point;
    width: number;
    height: number;
  };

  // Validation
  isValid: boolean;
  validationErrors: string[];

  // Wall analysis
  wallLengths: number[];
  averageWallLength: number;
  shortestWall: number;
  longestWall: number;

  // Interior angles
  interiorAngles: number[];
  averageAngle: number;

  // Efficiency metrics
  usableArea: number; // Area minus wall thickness
  wallToFloorRatio: number;
}

export class AdvancedRoomCalculator {
  private static readonly PRECISION = 1e-6;
  private static readonly MIN_WALL_LENGTH = 0.1;
  private static readonly MAX_WALL_LENGTH = 50;
  private static readonly MIN_ANGLE = 15; // degrees
  private static readonly MAX_ANGLE = 345; // degrees
  // Added constraints for Roomi requirements
  private static readonly MIN_WALL_HEIGHT = 2.8;
  private static readonly MAX_WALL_HEIGHT = 3.0;
  private static readonly MIN_WALL_THICKNESS = 0.1;
  private static readonly MAX_WALL_THICKNESS = 0.25;
  private static readonly MAX_ROOM_AREA = 35; // m²

  /**
   * Calculate comprehensive room metrics
   */
  static calculateRoomMetrics(walls: Wall[]): RoomMetrics {
    const validationErrors: string[] = [];

    // Basic validation
    if (walls.length < 3) {
      return this.createEmptyMetrics(['Room must have at least 3 walls']);
    }

    // Get ordered vertices
    const vertices = this.getOrderedVertices(walls);
    if (vertices.length < 3) {
      return this.createEmptyMetrics(['Unable to form valid polygon from walls']);
    }

    // Validate wall connections
    const connectionErrors = this.validateWallConnections(walls);
    validationErrors.push(...connectionErrors);

    // Calculate basic measurements
    const area = this.calculatePolygonArea(vertices);
    const perimeter = this.calculatePerimeter(walls);

    if (area <= 0) {
      validationErrors.push('Invalid room area calculated');
    }
    // Room size constraint
    if (area - this.MAX_ROOM_AREA > this.PRECISION) {
      validationErrors.push(
        `Room area exceeds maximum allowed (${area.toFixed(2)}m² > ${this.MAX_ROOM_AREA}m²)`,
      );
    }

    // Calculate advanced metrics
    const compactness = this.calculateCompactness(area, perimeter);
    const rectangularity = this.calculateRectangularity(vertices);
    const convexity = this.calculateConvexity(vertices);
    const aspectRatio = this.calculateAspectRatio(vertices);

    // Geometric properties
    const centroid = this.calculateCentroid(vertices);
    const boundingBox = this.calculateBoundingBox(vertices);

    // Wall analysis
    const wallLengths = walls.map((wall) => this.calculateDistance(wall.start, wall.end));
    const averageWallLength =
      wallLengths.reduce((sum, len) => sum + len, 0) / wallLengths.length;
    const shortestWall = Math.min(...wallLengths);
    const longestWall = Math.max(...wallLengths);

    // Validate wall lengths
    wallLengths.forEach((length, index) => {
      if (length < this.MIN_WALL_LENGTH) {
        validationErrors.push(`Wall ${index + 1} is too short (${length.toFixed(2)}m)`);
      }
      if (length > this.MAX_WALL_LENGTH) {
        validationErrors.push(`Wall ${index + 1} is too long (${length.toFixed(2)}m)`);
      }
    });

    // Validate wall heights and thicknesses
    walls.forEach((wall, index) => {
      if (wall.height < this.MIN_WALL_HEIGHT || wall.height > this.MAX_WALL_HEIGHT) {
        validationErrors.push(
          `Wall ${index + 1} height (${wall.height.toFixed(2)}m) must be between ${this.MIN_WALL_HEIGHT}m and ${this.MAX_WALL_HEIGHT}m`,
        );
      }
      if (
        wall.thickness < this.MIN_WALL_THICKNESS ||
        wall.thickness > this.MAX_WALL_THICKNESS
      ) {
        validationErrors.push(
          `Wall ${index + 1} thickness (${wall.thickness.toFixed(2)}m) must be between ${this.MIN_WALL_THICKNESS}m and ${this.MAX_WALL_THICKNESS}m`,
        );
      }
    });

    // Calculate interior angles
    const interiorAngles = this.calculateInteriorAngles(vertices);
    const averageAngle =
      interiorAngles.reduce((sum, angle) => sum + angle, 0) / interiorAngles.length;

    // Validate angles
    interiorAngles.forEach((angle, index) => {
      const angleDegrees = (angle * 180) / Math.PI;
      if (angleDegrees < this.MIN_ANGLE || angleDegrees > this.MAX_ANGLE) {
        validationErrors.push(
          `Corner ${index + 1} has extreme angle (${angleDegrees.toFixed(1)}°)`,
        );
      }
    });

    // Efficiency metrics
    const avgThickness =
      walls.reduce((sum, wall) => sum + wall.thickness, 0) / walls.length;
    const usableArea = Math.max(0, area - perimeter * avgThickness);
    const wallToFloorRatio = (perimeter * avgThickness) / area;

    return {
      // Basic measurements
      area,
      perimeter,
      wallCount: walls.length,

      // Advanced metrics
      compactness,
      rectangularity,
      convexity,
      aspectRatio,

      // Geometric properties
      centroid,
      boundingBox,

      // Validation
      isValid: validationErrors.length === 0 && area > 0,
      validationErrors,

      // Wall analysis
      wallLengths,
      averageWallLength,
      shortestWall,
      longestWall,

      // Interior angles
      interiorAngles,
      averageAngle,

      // Efficiency metrics
      usableArea,
      wallToFloorRatio,
    };
  }

  /**
   * Get ordered vertices from walls, handling complex polygons
   */
  private static getOrderedVertices(walls: Wall[]): Point[] {
    if (walls.length === 0) {
      return [];
    }

    // Build adjacency map
    const adjacencyMap = new Map<string, Point[]>();

    walls.forEach((wall) => {
      const startKey = this.pointToKey(wall.start);
      const endKey = this.pointToKey(wall.end);

      if (!adjacencyMap.has(startKey)) {
        adjacencyMap.set(startKey, []);
      }
      if (!adjacencyMap.has(endKey)) {
        adjacencyMap.set(endKey, []);
      }

      adjacencyMap.get(startKey)!.push(wall.end);
      adjacencyMap.get(endKey)!.push(wall.start);
    });

    // Find starting point (any point will do for a closed polygon)
    const startPoint = walls[0].start;
    const vertices: Point[] = [startPoint];
    let currentPoint = startPoint;
    const visited = new Set<string>();
    visited.add(this.pointToKey(startPoint));

    // Traverse the polygon
    while (vertices.length < walls.length) {
      const currentKey = this.pointToKey(currentPoint);
      const neighbors = adjacencyMap.get(currentKey) || [];

      // Find next unvisited neighbor
      let nextPoint: Point | null = null;
      for (const neighbor of neighbors) {
        const neighborKey = this.pointToKey(neighbor);
        if (!visited.has(neighborKey)) {
          nextPoint = neighbor;
          break;
        }
      }

      if (!nextPoint) {
        break; // No more unvisited neighbors
      }

      vertices.push(nextPoint);
      visited.add(this.pointToKey(nextPoint));
      currentPoint = nextPoint;
    }

    // Ensure counter-clockwise orientation
    return this.ensureCounterClockwise(vertices);
  }

  /**
   * Calculate polygon area using the Shoelace formula
   */
  private static calculatePolygonArea(vertices: Point[]): number {
    if (vertices.length < 3) {
      return 0;
    }

    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].z;
      area -= vertices[j].x * vertices[i].z;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Calculate perimeter from walls
   */
  private static calculatePerimeter(walls: Wall[]): number {
    return walls.reduce(
      (sum, wall) => sum + this.calculateDistance(wall.start, wall.end),
      0,
    );
  }

  /**
   * Calculate compactness (how close to a circle)
   * Formula: (4π × Area) / (Perimeter²)
   * Returns 1 for perfect circle, lower values for less compact shapes
   */
  private static calculateCompactness(area: number, perimeter: number): number {
    if (perimeter === 0) {
      return 0;
    }
    return (4 * Math.PI * area) / (perimeter * perimeter);
  }

  /**
   * Calculate rectangularity (how close to a rectangle)
   */
  private static calculateRectangularity(vertices: Point[]): number {
    if (vertices.length !== 4) {
      return 0;
    }

    // Calculate all angles
    const angles = this.calculateInteriorAngles(vertices);

    // Check how close angles are to 90 degrees
    const rightAngle = Math.PI / 2;
    const angleDeviations = angles.map((angle) => Math.abs(angle - rightAngle));
    const maxDeviation = Math.max(...angleDeviations);

    // Calculate side length ratios
    const sideLengths = [];
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      sideLengths.push(this.calculateDistance(vertices[i], vertices[j]));
    }

    // For rectangle, opposite sides should be equal
    const ratio1 =
      Math.min(sideLengths[0], sideLengths[2]) / Math.max(sideLengths[0], sideLengths[2]);
    const ratio2 =
      Math.min(sideLengths[1], sideLengths[3]) / Math.max(sideLengths[1], sideLengths[3]);

    const angleScore = Math.max(0, 1 - maxDeviation / (Math.PI / 4)); // Max deviation of 45°
    const ratioScore = (ratio1 + ratio2) / 2;

    return (angleScore + ratioScore) / 2;
  }

  /**
   * Calculate convexity (how convex the polygon is)
   */
  private static calculateConvexity(vertices: Point[]): number {
    if (vertices.length < 3) {
      return 0;
    }

    let signChanges = 0;
    let lastCrossProduct = 0;

    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];
      const p3 = vertices[(i + 2) % vertices.length];

      const crossProduct = (p2.x - p1.x) * (p3.z - p2.z) - (p2.z - p1.z) * (p3.x - p2.x);

      if (Math.abs(crossProduct) > this.PRECISION) {
        if (
          lastCrossProduct !== 0 &&
          Math.sign(crossProduct) !== Math.sign(lastCrossProduct)
        ) {
          signChanges++;
        }
        lastCrossProduct = crossProduct;
      }
    }

    // Convex polygon should have no sign changes in cross products
    return Math.max(0, 1 - signChanges / vertices.length);
  }

  /**
   * Calculate aspect ratio (width to height ratio of bounding box)
   */
  private static calculateAspectRatio(vertices: Point[]): number {
    const boundingBox = this.calculateBoundingBox(vertices);
    const width = boundingBox.width;
    const height = boundingBox.height;

    if (height === 0) {
      return Infinity;
    }
    return width / height;
  }

  /**
   * Calculate centroid of polygon
   */
  private static calculateCentroid(vertices: Point[]): Point {
    if (vertices.length === 0) {
      return { x: 0, z: 0 };
    }

    const area = this.calculatePolygonArea(vertices);
    if (area === 0) {
      // Fallback to simple average for degenerate cases
      const sum = vertices.reduce((acc, v) => ({ x: acc.x + v.x, z: acc.z + v.z }), {
        x: 0,
        z: 0,
      });
      return { x: sum.x / vertices.length, z: sum.z / vertices.length };
    }

    let cx = 0,
      cz = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const factor = vertices[i].x * vertices[j].z - vertices[j].x * vertices[i].z;
      cx += (vertices[i].x + vertices[j].x) * factor;
      cz += (vertices[i].z + vertices[j].z) * factor;
    }

    const factor = 1 / (6 * area);
    return { x: cx * factor, z: cz * factor };
  }

  /**
   * Calculate bounding box
   */
  private static calculateBoundingBox(vertices: Point[]) {
    if (vertices.length === 0) {
      return { min: { x: 0, z: 0 }, max: { x: 0, z: 0 }, width: 0, height: 0 };
    }

    const xs = vertices.map((v) => v.x);
    const zs = vertices.map((v) => v.z);

    const min = { x: Math.min(...xs), z: Math.min(...zs) };
    const max = { x: Math.max(...xs), z: Math.max(...zs) };

    return {
      min,
      max,
      width: max.x - min.x,
      height: max.z - min.z,
    };
  }

  /**
   * Calculate interior angles of polygon
   */
  private static calculateInteriorAngles(vertices: Point[]): number[] {
    const angles: number[] = [];

    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length];
      const curr = vertices[i];
      const next = vertices[(i + 1) % vertices.length];

      const v1 = { x: prev.x - curr.x, z: prev.z - curr.z };
      const v2 = { x: next.x - curr.x, z: next.z - curr.z };

      const dot = v1.x * v2.x + v1.z * v2.z;
      const cross = v1.x * v2.z - v1.z * v2.x;

      let angle = Math.atan2(cross, dot);
      if (angle < 0) {
        angle += 2 * Math.PI;
      }

      angles.push(angle);
    }

    return angles;
  }

  /**
   * Validate wall connections
   */
  private static validateWallConnections(walls: Wall[]): string[] {
    const errors: string[] = [];
    const pointConnections = new Map<string, number>();

    // Count connections for each point
    walls.forEach((wall) => {
      const startKey = this.pointToKey(wall.start);
      const endKey = this.pointToKey(wall.end);

      pointConnections.set(startKey, (pointConnections.get(startKey) || 0) + 1);
      pointConnections.set(endKey, (pointConnections.get(endKey) || 0) + 1);
    });

    // Each point should have exactly 2 connections for a closed polygon
    for (const [point, connections] of pointConnections.entries()) {
      if (connections !== 2) {
        errors.push(`Point ${point} has ${connections} connections (should be 2)`);
      }
    }

    return errors;
  }

  /**
   * Utility functions
   */
  private static calculateDistance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
  }

  private static pointToKey(point: Point): string {
    return `${point.x.toFixed(3)},${point.z.toFixed(3)}`;
  }

  private static ensureCounterClockwise(vertices: Point[]): Point[] {
    if (vertices.length < 3) {
      return vertices;
    }

    // Calculate signed area
    let signedArea = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      signedArea += (vertices[j].x - vertices[i].x) * (vertices[j].z + vertices[i].z);
    }

    // If clockwise (positive area), reverse
    return signedArea > 0 ? [...vertices].reverse() : vertices;
  }

  private static createEmptyMetrics(errors: string[]): RoomMetrics {
    return {
      area: 0,
      perimeter: 0,
      wallCount: 0,
      compactness: 0,
      rectangularity: 0,
      convexity: 0,
      aspectRatio: 0,
      centroid: { x: 0, z: 0 },
      boundingBox: { min: { x: 0, z: 0 }, max: { x: 0, z: 0 }, width: 0, height: 0 },
      isValid: false,
      validationErrors: errors,
      wallLengths: [],
      averageWallLength: 0,
      shortestWall: 0,
      longestWall: 0,
      interiorAngles: [],
      averageAngle: 0,
      usableArea: 0,
      wallToFloorRatio: 0,
    };
  }
}
