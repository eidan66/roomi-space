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

export type RoomObject = {
  id: string;
  type: string; // e.g., "chair", "lamp"
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
};

export type Room = {
  id: string;
  userId: string;
  name: string;
  walls: Wall[];
  objects: RoomObject[];
  createdAt: string;
};
