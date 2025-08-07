'use client';

import { useCallback, useMemo, useState } from 'react';

import { Wall } from './Floorplan2DCanvas';

// Advanced wall connection and room validation algorithms
export class RoomGeometry {
  static PRECISION = 0.001; // 1mm precision

  // Create consistent point keys for comparison
  static createPointKey(point: { x: number; z: number }): string {
    const x = Math.round(point.x / this.PRECISION) * this.PRECISION;
    const z = Math.round(point.z / this.PRECISION) * this.PRECISION;
    return `${x.toFixed(3)},${z.toFixed(3)}`;
  }

  // Check if two points are the same within precision
  static pointsEqual(a: { x: number; z: number }, b: { x: number; z: number }): boolean {
    return Math.abs(a.x - b.x) < this.PRECISION && Math.abs(a.z - b.z) < this.PRECISION;
  }

  // Calculate distance between two points
  static distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
  }

  // Get all unique vertices from walls
  static getUniqueVertices(walls: Wall[]): { x: number; z: number }[] {
    const vertexMap = new Map<string, { x: number; z: number }>();

    walls.forEach((wall) => {
      const startKey = this.createPointKey(wall.start);
      const endKey = this.createPointKey(wall.end);

      if (!vertexMap.has(startKey)) {
        vertexMap.set(startKey, wall.start);
      }
      if (!vertexMap.has(endKey)) {
        vertexMap.set(endKey, wall.end);
      }
    });

    return Array.from(vertexMap.values());
  }

  // Build connection graph for room validation
  static buildConnectionGraph(
    walls: Wall[],
  ): Map<
    string,
    { point: { x: number; z: number }; connections: { x: number; z: number }[] }
  > {
    const graph = new Map();

    walls.forEach((wall) => {
      const startKey = this.createPointKey(wall.start);
      const endKey = this.createPointKey(wall.end);

      if (!graph.has(startKey)) {
        graph.set(startKey, { point: wall.start, connections: [] });
      }
      if (!graph.has(endKey)) {
        graph.set(endKey, { point: wall.end, connections: [] });
      }

      graph.get(startKey).connections.push(wall.end);
      graph.get(endKey).connections.push(wall.start);
    });

    return graph;
  }

  // Check if walls form a valid closed room
  static isValidRoom(walls: Wall[]): boolean {
    if (walls.length < 3) {
      return false;
    }

    const graph = this.buildConnectionGraph(walls);

    // Each vertex should have exactly 2 connections for a closed polygon
    for (const [_, data] of graph.entries()) {
      if (data.connections.length !== 2) {
        return false;
      }
    }

    return true;
  }

  // Get ordered vertices by traversing the room perimeter
  static getOrderedVertices(walls: Wall[]): { x: number; z: number }[] {
    if (walls.length === 0) {
      return [];
    }

    const graph = this.buildConnectionGraph(walls);
    if (graph.size === 0) {
      return [];
    }

    // Find starting point (leftmost, then bottommost for consistency)
    let startPoint: { x: number; z: number } | null = null;
    let minX = Infinity;
    let minZ = Infinity;

    for (const [_, data] of graph.entries()) {
      if (data.connections.length === 2) {
        if (
          data.point.x < minX ||
          (Math.abs(data.point.x - minX) < this.PRECISION && data.point.z < minZ)
        ) {
          minX = data.point.x;
          minZ = data.point.z;
          startPoint = data.point;
        }
      }
    }

    if (!startPoint) {
      const firstEntry = graph.entries().next().value;
      if (!firstEntry) {
        return [];
      }
      startPoint = firstEntry[1].point;
    }

    // Traverse the polygon
    const orderedVertices: { x: number; z: number }[] = [];
    const visited = new Set<string>();
    let currentPoint = startPoint;
    let previousPoint: { x: number; z: number } | null = null;

    while (currentPoint && orderedVertices.length < walls.length + 1) {
      const currentKey = this.createPointKey(currentPoint);

      if (visited.has(currentKey) && orderedVertices.length > 2) {
        break;
      }

      orderedVertices.push({ x: currentPoint.x, z: currentPoint.z });
      visited.add(currentKey);

      const currentData = graph.get(currentKey);
      if (!currentData) {
        break;
      }

      // Find next unvisited neighbor (avoid going back)
      let nextPoint: { x: number; z: number } | null = null;
      for (const neighbor of currentData.connections) {
        const neighborKey = this.createPointKey(neighbor);
        const isSameAsPrevious =
          previousPoint && this.pointsEqual(neighbor, previousPoint);

        if (
          !isSameAsPrevious &&
          (!visited.has(neighborKey) || orderedVertices.length >= walls.length)
        ) {
          nextPoint = neighbor;
          break;
        }
      }

      previousPoint = currentPoint;
      if (nextPoint) {
        currentPoint = nextPoint;
      } else {
        break;
      }
    }

    return orderedVertices;
  }

  // Calculate room area using shoelace formula (fixed for proper exterior area)
  static calculateArea(vertices: { x: number; z: number }[]): number {
    if (vertices.length < 3) {
      return 0;
    }

    // Ensure vertices are in counter-clockwise order for positive area
    const orderedVertices = this.ensureCounterClockwise(vertices);

    let area = 0;
    for (let i = 0; i < orderedVertices.length; i++) {
      const j = (i + 1) % orderedVertices.length;
      area += orderedVertices[i].x * orderedVertices[j].z;
      area -= orderedVertices[j].x * orderedVertices[i].z;
    }

    return Math.abs(area) / 2;
  }

  // Ensure vertices are in counter-clockwise order
  static ensureCounterClockwise(
    vertices: { x: number; z: number }[],
  ): { x: number; z: number }[] {
    if (vertices.length < 3) {
      return vertices;
    }

    // Calculate signed area to determine winding order
    let signedArea = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      signedArea += (vertices[j].x - vertices[i].x) * (vertices[j].z + vertices[i].z);
    }

    // If signed area is positive, vertices are clockwise, so reverse them
    return signedArea > 0 ? [...vertices].reverse() : vertices;
  }

  // Calculate room perimeter
  static calculatePerimeter(walls: Wall[]): number {
    return walls.reduce((sum, wall) => sum + this.distance(wall.start, wall.end), 0);
  }

  // Find wall intersections for advanced room features
  static findWallIntersections(
    walls: Wall[],
  ): { point: { x: number; z: number }; walls: Wall[] }[] {
    const intersections: { point: { x: number; z: number }; walls: Wall[] }[] = [];
    const graph = this.buildConnectionGraph(walls);

    for (const [_, data] of graph.entries()) {
      if (data.connections.length > 2) {
        const connectedWalls = walls.filter(
          (wall) =>
            this.pointsEqual(wall.start, data.point) ||
            this.pointsEqual(wall.end, data.point),
        );
        intersections.push({ point: data.point, walls: connectedWalls });
      }
    }

    return intersections;
  }

  // Generate wall segments with proper connections
  static generateConnectedWalls(
    vertices: { x: number; z: number }[],
    height: number = 2.5,
    thickness: number = 0.2,
  ): Wall[] {
    if (vertices.length < 3) {
      return [];
    }

    const walls: Wall[] = [];

    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];

      // Skip very short walls
      if (this.distance(start, end) < 0.1) {
        continue;
      }

      walls.push({
        id: `wall-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        start: { x: start.x, z: start.z },
        end: { x: end.x, z: end.z },
        height,
        thickness,
      });
    }

    return walls;
  }

  // Optimize wall connections (merge collinear walls, fix gaps)
  static optimizeWalls(walls: Wall[]): Wall[] {
    if (walls.length === 0) {
      return walls;
    }

    const SNAP_EPS = Math.max(this.PRECISION, 0.005); // 5mm snap for gap fixing
    const COLLINEAR_EPS = 1e-3; // cross-product threshold for collinearity

    // 1) Snap near endpoints together to fix small gaps
    const clusterKey = (p: { x: number; z: number }) => {
      const x = Math.round(p.x / SNAP_EPS) * SNAP_EPS;
      const z = Math.round(p.z / SNAP_EPS) * SNAP_EPS;
      return `${x.toFixed(3)},${z.toFixed(3)}`;
    };

    const representatives = new Map<string, { x: number; z: number }>();
    const getRep = (p: { x: number; z: number }) => {
      const key = clusterKey(p);
      if (!representatives.has(key)) {
        representatives.set(key, {
          x: Math.round(p.x / SNAP_EPS) * SNAP_EPS,
          z: Math.round(p.z / SNAP_EPS) * SNAP_EPS,
        });
      }
      return representatives.get(key)!;
    };

    let fixed = walls.map((w) => ({
      ...w,
      start: getRep(w.start),
      end: getRep(w.end),
    }));

    // 2) Remove zero/very short segments and duplicates
    const normalizeWall = (w: Wall) => {
      const a = w.start;
      const b = w.end;
      // Direction-independent key
      const key1 = `${this.createPointKey(a)}|${this.createPointKey(b)}`;
      const key2 = `${this.createPointKey(b)}|${this.createPointKey(a)}`;
      return key1 < key2 ? key1 : key2;
    };

    const unique = new Map<string, Wall>();
    fixed.forEach((w) => {
      const length = this.distance(w.start, w.end);
      if (length < 0.05) {
        return; // drop too short
      }
      const key = normalizeWall(w);
      if (!unique.has(key)) {
        unique.set(key, w);
      }
    });
    fixed = Array.from(unique.values());

    // 3) Merge collinear contiguous segments iteratively
    const pointKey = (p: { x: number; z: number }) => this.createPointKey(p);

    const vector = (a: { x: number; z: number }, b: { x: number; z: number }) => ({
      x: b.x - a.x,
      z: b.z - a.z,
    });
    const isCollinearForward = (
      a1: { x: number; z: number },
      a2: { x: number; z: number },
      b1: { x: number; z: number },
      b2: { x: number; z: number },
    ) => {
      // a2==b1 shared point. Check if (a2-a1) and (b2-b1) are collinear and pointing same way
      const v1 = vector(a1, a2);
      const v2 = vector(b1, b2);
      const cross = v1.x * v2.z - v1.z * v2.x;
      const dot = v1.x * v2.x + v1.z * v2.z;
      return Math.abs(cross) < COLLINEAR_EPS && dot > 0;
    };

    let merged = true;
    while (merged) {
      merged = false;

      // Build adjacency: for each point, which wall indices start/end there
      const startsAt = new Map<string, number[]>();
      const endsAt = new Map<string, number[]>();
      fixed.forEach((w, i) => {
        const sk = pointKey(w.start);
        const ek = pointKey(w.end);
        if (!startsAt.has(sk)) {
          startsAt.set(sk, []);
        }
        if (!endsAt.has(ek)) {
          endsAt.set(ek, []);
        }
        startsAt.get(sk)!.push(i);
        endsAt.get(ek)!.push(i);
      });

      const toRemove = new Set<number>();
      const toReplace: Array<{ idx: number; wall: Wall }> = [];

      for (let i = 0; i < fixed.length; i++) {
        if (toRemove.has(i)) {
          continue;
        }
        const w = fixed[i];
        const jointKey = pointKey(w.end);
        const outgoing = startsAt.get(jointKey) || [];
        const incoming = endsAt.get(jointKey) || [];

        // Only merge if simple chain: exactly one incoming (our w) and one outgoing (candidate)
        if (outgoing.length === 1 && incoming.length === 1) {
          const j = outgoing[0];
          if (j !== i && !toRemove.has(j)) {
            const w2 = fixed[j];
            if (
              this.pointsEqual(w.end, w2.start) &&
              isCollinearForward(w.start, w.end, w2.start, w2.end)
            ) {
              // Merge into [w.start -> w2.end]
              const mergedWall: Wall = {
                ...w,
                end: w2.end,
              };
              toRemove.add(i);
              toRemove.add(j);
              toReplace.push({ idx: i, wall: mergedWall });
            }
          }
        }
      }

      if (toRemove.size > 0) {
        // Rebuild fixed: replace first occurrence, drop the rest
        const kept: Wall[] = [];
        fixed.forEach((w, idx) => {
          if (toRemove.has(idx)) {
            return;
          }
          kept.push(w);
        });
        // Add replacements
        kept.push(...toReplace.map((r) => r.wall));
        fixed = kept;
        merged = true;
      }
    }

    // 4) Final pass: ensure every connection uses snapped representatives again
    fixed = fixed.map((w) => ({
      ...w,
      start: getRep(w.start),
      end: getRep(w.end),
    }));

    return fixed;
  }

  // Generate room statistics
  static getRoomStatistics(walls: Wall[]): {
    isValid: boolean;
    area: number;
    perimeter: number;
    wallCount: number;
    averageWallLength: number;
    averageHeight: number;
    vertices: { x: number; z: number }[];
    intersections: { point: { x: number; z: number }; walls: Wall[] }[];
  } {
    const vertices = this.getOrderedVertices(walls);
    const isValid = this.isValidRoom(walls);
    const area = isValid ? this.calculateArea(vertices) : 0;
    const perimeter = this.calculatePerimeter(walls);
    const intersections = this.findWallIntersections(walls);

    return {
      isValid,
      area,
      perimeter,
      wallCount: walls.length,
      averageWallLength: walls.length > 0 ? perimeter / walls.length : 0,
      averageHeight:
        walls.length > 0 ? walls.reduce((sum, w) => sum + w.height, 0) / walls.length : 0,
      vertices,
      intersections,
    };
  }
}

// Hook for advanced room management
export const useAdvancedRoom = (initialWalls: Wall[] = []) => {
  const [walls, setWalls] = useState<Wall[]>(initialWalls);

  const roomStats = useMemo(() => RoomGeometry.getRoomStatistics(walls), [walls]);

  const addWall = useCallback((wall: Wall) => {
    setWalls((prev) => [...prev, wall]);
  }, []);

  const removeWall = useCallback((wallId: string) => {
    setWalls((prev) => prev.filter((w) => w.id !== wallId));
  }, []);

  const updateWall = useCallback((wallId: string, updates: Partial<Wall>) => {
    setWalls((prev) => prev.map((w) => (w.id === wallId ? { ...w, ...updates } : w)));
  }, []);

  const clearWalls = useCallback(() => {
    setWalls([]);
  }, []);

  const optimizeWalls = useCallback(() => {
    setWalls((prev) => RoomGeometry.optimizeWalls(prev));
  }, []);

  const generateRectangularRoom = useCallback(
    (
      width: number,
      height: number,
      wallHeight: number = 2.5,
      wallThickness: number = 0.2,
    ) => {
      const vertices = [
        { x: -width / 2, z: -height / 2 },
        { x: width / 2, z: -height / 2 },
        { x: width / 2, z: height / 2 },
        { x: -width / 2, z: height / 2 },
      ];

      const newWalls = RoomGeometry.generateConnectedWalls(
        vertices,
        wallHeight,
        wallThickness,
      );
      setWalls(newWalls);
    },
    [],
  );

  const generateLShapedRoom = useCallback(
    (
      width: number,
      height: number,
      cutWidth: number,
      cutHeight: number,
      wallHeight: number = 2.5,
      wallThickness: number = 0.2,
    ) => {
      // Create L-shaped vertices in counter-clockwise order for proper floor rendering
      const vertices = [
        { x: -width / 2, z: -height / 2 }, // Bottom-left
        { x: width / 2, z: -height / 2 }, // Bottom-right
        { x: width / 2, z: -height / 2 + cutHeight }, // Cut bottom-right
        { x: -width / 2 + cutWidth, z: -height / 2 + cutHeight }, // Cut inner corner
        { x: -width / 2 + cutWidth, z: height / 2 }, // Cut top-right
        { x: -width / 2, z: height / 2 }, // Top-left
      ];

      const newWalls = RoomGeometry.generateConnectedWalls(
        vertices,
        wallHeight,
        wallThickness,
      );
      setWalls(newWalls);
    },
    [],
  );

  return {
    walls,
    setWalls,
    roomStats,
    addWall,
    removeWall,
    updateWall,
    clearWalls,
    optimizeWalls,
    generateRectangularRoom,
    generateLShapedRoom,
  };
};

export default RoomGeometry;
