import * as THREE from 'three';

import { Point } from '@/types/room';

import { AdvancedRoomDrawing, DrawingRoom } from './advanced-room-drawing';

export interface FloorRenderingOptions {
  useAdvancedTriangulation?: boolean;
  handleHoles?: boolean;
  generateUVs?: boolean;
  optimizeGeometry?: boolean;
}

export class EnhancedFloorRenderer {
  private static readonly PRECISION = 0.001;
  private static readonly MIN_TRIANGLE_AREA = 0.001; // 1mm²

  /**
   * Create floor geometry for multiple rooms including nested ones
   */
  static createMultiRoomFloorGeometry(
    rooms: DrawingRoom[],
    options: FloorRenderingOptions = {},
  ): THREE.BufferGeometry {
    const {
      useAdvancedTriangulation = true,
      handleHoles = true,
      generateUVs = true,
      optimizeGeometry = true,
    } = options;

    const geometry = new THREE.BufferGeometry();
    const allPositions: number[] = [];
    const allIndices: number[] = [];
    const allNormals: number[] = [];
    const allUVs: number[] = [];

    let vertexOffset = 0;

    // Group rooms by nesting level
    const roomGroups = this.groupRoomsByNesting(rooms);

    // Process each room group
    roomGroups.forEach((group) => {
      const mainRoom = group.main;
      const holes = group.holes;

      if (!mainRoom.isCompleted) {
        return;
      }

      const mainVertices = this.getRoomVertices(mainRoom);
      if (mainVertices.length < 3) {
        return;
      }

      // Create floor with holes if needed
      let floorData;
      if (handleHoles && holes.length > 0) {
        floorData = this.createFloorWithHoles(
          mainVertices,
          holes.map((h) => this.getRoomVertices(h)),
        );
      } else {
        floorData = this.createSimpleFloor(mainVertices, useAdvancedTriangulation);
      }

      if (floorData) {
        // Add to combined geometry
        floorData.positions.forEach((pos) => allPositions.push(pos));
        floorData.indices.forEach((idx) => allIndices.push(idx + vertexOffset));
        floorData.normals.forEach((norm) => allNormals.push(norm));
        if (generateUVs) {
          floorData.uvs.forEach((uv) => allUVs.push(uv));
        }

        vertexOffset += floorData.positions.length / 3;
      }
    });

    // Set geometry attributes
    if (allPositions.length > 0) {
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(allPositions, 3),
      );
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));

      if (generateUVs && allUVs.length > 0) {
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUVs, 2));
      }

      if (allIndices.length > 0) {
        geometry.setIndex(allIndices);
      }

      if (optimizeGeometry) {
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      }
    }

    return geometry;
  }

  /**
   * Group rooms by nesting relationships - with renderer-side safety net
   */
  private static groupRoomsByNesting(
    rooms: DrawingRoom[],
  ): Array<{ main: DrawingRoom; holes: DrawingRoom[] }> {
    const groups: Array<{ main: DrawingRoom; holes: DrawingRoom[] }> = [];
    const processedRooms = new Set<string>();

    // Safety net: Re-run nesting detection to ensure relationships are up-to-date
    const updatedRooms = AdvancedRoomDrawing.findNestedRooms(rooms);

    updatedRooms.forEach((room) => {
      if (processedRooms.has(room.id) || !room.isCompleted) {
        return;
      }

      // If this room is not nested inside another, it's a main room
      if (!room.parentRoomId) {
        const holes = updatedRooms.filter(
          (r) => r.parentRoomId === room.id && r.isCompleted,
        );
        groups.push({ main: room, holes });

        processedRooms.add(room.id);
        holes.forEach((hole) => processedRooms.add(hole.id));
      }
    });

    return groups;
  }

  /**
   * Get ordered vertices from a room's walls
   */
  private static getRoomVertices(room: DrawingRoom): Point[] {
    if (room.walls.length === 0) {
      return [];
    }

    // Build adjacency map for better wall connection detection
    const pointMap = new Map<
      string,
      { point: Point; walls: { wall: any; isStart: boolean }[] }
    >();

    // Add all wall endpoints to the map
    room.walls.forEach((wall) => {
      const startKey = `${wall.start.x.toFixed(6)},${wall.start.z.toFixed(6)}`;
      const endKey = `${wall.end.x.toFixed(6)},${wall.end.z.toFixed(6)}`;

      if (!pointMap.has(startKey)) {
        pointMap.set(startKey, { point: wall.start, walls: [] });
      }
      if (!pointMap.has(endKey)) {
        pointMap.set(endKey, { point: wall.end, walls: [] });
      }

      pointMap.get(startKey)!.walls.push({ wall, isStart: true });
      pointMap.get(endKey)!.walls.push({ wall, isStart: false });
    });

    // Find a starting point (preferably leftmost, then topmost)
    let startPoint: Point | null = null;
    let startKey = '';

    for (const [key, data] of pointMap.entries()) {
      if (
        !startPoint ||
        data.point.x < startPoint.x ||
        (Math.abs(data.point.x - startPoint.x) < this.PRECISION &&
          data.point.z < startPoint.z)
      ) {
        startPoint = data.point;
        startKey = key;
      }
    }

    if (!startPoint) {
      return [];
    }

    // Trace the polygon
    const vertices: Point[] = [];
    const visitedWalls = new Set<string>();
    let currentKey = startKey;
    let previousWallId: string | null = null;

    do {
      const currentData = pointMap.get(currentKey);
      if (!currentData) {
        break;
      }

      vertices.push(currentData.point);

      // Find next unvisited wall
      let nextWall = null;
      let nextPoint: Point | null = null;
      let nextKey = '';

      for (const wallData of currentData.walls) {
        if (visitedWalls.has(wallData.wall.id) || wallData.wall.id === previousWallId) {
          continue;
        }

        const otherPoint = wallData.isStart ? wallData.wall.end : wallData.wall.start;
        const otherKey = `${otherPoint.x.toFixed(6)},${otherPoint.z.toFixed(6)}`;

        nextWall = wallData.wall;
        nextPoint = otherPoint;
        nextKey = otherKey;
        break;
      }

      if (!nextWall || !nextPoint) {
        break;
      }

      visitedWalls.add(nextWall.id);
      previousWallId = nextWall.id;
      currentKey = nextKey;

      // Check if we've completed the loop
      if (this.isPointNear(nextPoint, vertices[0]) && vertices.length >= 3) {
        break;
      }
    } while (currentKey !== startKey && vertices.length < room.walls.length + 1);

    return vertices;
  }

  /**
   * Create simple floor without holes
   */
  private static createSimpleFloor(
    vertices: Point[],
    useAdvancedTriangulation = true,
  ): { positions: number[]; indices: number[]; normals: number[]; uvs: number[] } | null {
    if (vertices.length < 3) {
      return null;
    }

    // Ensure counter-clockwise winding
    const orderedVertices = this.ensureCounterClockwise(vertices);

    // Triangulate
    const triangles = useAdvancedTriangulation
      ? this.advancedEarClipping(orderedVertices)
      : this.simpleTriangulation(orderedVertices);

    if (triangles.length === 0) {
      return null;
    }

    // Calculate bounding box for UV mapping
    const bounds = this.calculateBounds(orderedVertices);

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Add vertices
    orderedVertices.forEach((vertex, _index) => {
      positions.push(vertex.x, 0, vertex.z);
      normals.push(0, 1, 0); // Floor normal points up

      // Calculate UV coordinates
      const u = (vertex.x - bounds.minX) / bounds.width;
      const v = (vertex.z - bounds.minZ) / bounds.height;
      uvs.push(u, v);
    });

    // Add triangle indices
    triangles.forEach((triangle) => {
      // Find indices of triangle vertices in orderedVertices
      const idx0 = orderedVertices.findIndex(
        (v) =>
          Math.abs(v.x - triangle[0].x) < 0.001 && Math.abs(v.z - triangle[0].z) < 0.001,
      );
      const idx1 = orderedVertices.findIndex(
        (v) =>
          Math.abs(v.x - triangle[1].x) < 0.001 && Math.abs(v.z - triangle[1].z) < 0.001,
      );
      const idx2 = orderedVertices.findIndex(
        (v) =>
          Math.abs(v.x - triangle[2].x) < 0.001 && Math.abs(v.z - triangle[2].z) < 0.001,
      );

      if (idx0 !== -1 && idx1 !== -1 && idx2 !== -1) {
        indices.push(idx0, idx1, idx2);
      }
    });

    return { positions, indices, normals, uvs };
  }

  /**
   * Create floor with holes (complex room with nested rooms)
   */
  private static createFloorWithHoles(
    outerVertices: Point[],
    holes: Point[][],
  ): { positions: number[]; indices: number[]; normals: number[]; uvs: number[] } | null {
    if (outerVertices.length < 3) {
      return null;
    }

    // Ensure proper winding: outer CCW, holes CW
    const orderedOuter = this.ensureCounterClockwise(outerVertices);
    const orderedHoles = holes.map((hole) => this.ensureClockwise(hole));

    // Use constrained Delaunay triangulation for complex polygons with holes
    const triangles = this.constrainedTriangulation(orderedOuter, orderedHoles);

    if (triangles.length === 0) {
      // Fallback to simple triangulation without holes
      return this.createSimpleFloor(orderedOuter);
    }

    // Calculate combined bounding box
    const allVertices = [orderedOuter, ...orderedHoles].flat();
    const bounds = this.calculateBounds(allVertices);

    const positions: number[] = [];
    const indices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    let vertexIndex = 0;
    const vertexMap = new Map<string, number>();

    // Helper to add vertex if not already added
    const addVertex = (vertex: Point) => {
      const key = `${vertex.x.toFixed(6)},${vertex.z.toFixed(6)}`;
      if (vertexMap.has(key)) {
        return vertexMap.get(key)!;
      }

      positions.push(vertex.x, 0, vertex.z);
      normals.push(0, 1, 0);

      const u = (vertex.x - bounds.minX) / bounds.width;
      const v = (vertex.z - bounds.minZ) / bounds.height;
      uvs.push(u, v);

      vertexMap.set(key, vertexIndex);
      return vertexIndex++;
    };

    // Add all vertices and build indices
    triangles.forEach((triangle) => {
      const idx0 = addVertex(triangle[0]);
      const idx1 = addVertex(triangle[1]);
      const idx2 = addVertex(triangle[2]);

      // Check triangle area to avoid degenerate triangles
      const area = this.calculateTriangleArea(triangle[0], triangle[1], triangle[2]);
      if (area > this.MIN_TRIANGLE_AREA) {
        indices.push(idx0, idx1, idx2);
      }
    });

    return { positions, indices, normals, uvs };
  }

  /**
   * Advanced ear clipping algorithm with better triangle quality
   */
  private static advancedEarClipping(vertices: Point[]): Point[][] {
    if (vertices.length < 3) {
      return [];
    }
    if (vertices.length === 3) {
      return [vertices];
    }

    const triangles: Point[][] = [];
    const remaining = [...vertices];
    let attempts = 0;
    const maxAttempts = remaining.length * 2;

    while (remaining.length > 3 && attempts < maxAttempts) {
      let earFound = false;
      attempts++;

      // Try to find ears starting from different positions to avoid getting stuck
      const startIndex = attempts % remaining.length;

      for (let i = 0; i < remaining.length; i++) {
        const idx = (startIndex + i) % remaining.length;
        const prev = remaining[(idx - 1 + remaining.length) % remaining.length];
        const curr = remaining[idx];
        const next = remaining[(idx + 1) % remaining.length];

        // Check if this forms a valid ear
        if (this.isValidEar(remaining, idx)) {
          // Ensure the triangle has positive area
          const area = this.calculateTriangleArea(prev, curr, next);
          if (area > this.MIN_TRIANGLE_AREA) {
            triangles.push([prev, curr, next]);
            remaining.splice(idx, 1);
            earFound = true;
            break;
          }
        }
      }

      if (!earFound) {
        // Try a more aggressive approach - look for any valid triangle
        for (let i = 0; i < remaining.length; i++) {
          const prev = remaining[(i - 1 + remaining.length) % remaining.length];
          const curr = remaining[i];
          const next = remaining[(i + 1) % remaining.length];

          // Check if triangle is not degenerate and doesn't intersect polygon edges
          const area = this.calculateTriangleArea(prev, curr, next);
          if (
            area > this.MIN_TRIANGLE_AREA &&
            !this.triangleIntersectsPolygon(prev, curr, next, remaining, i)
          ) {
            triangles.push([prev, curr, next]);
            remaining.splice(i, 1);
            earFound = true;
            break;
          }
        }
      }

      if (!earFound) {
        // Final fallback - use fan triangulation from centroid
        console.warn('Ear clipping failed, using fan triangulation');
        return this.centroidFanTriangulation(vertices);
      }
    }

    // Add final triangle
    if (remaining.length === 3) {
      const area = this.calculateTriangleArea(remaining[0], remaining[1], remaining[2]);
      if (area > this.MIN_TRIANGLE_AREA) {
        triangles.push([remaining[0], remaining[1], remaining[2]]);
      }
    }

    return triangles;
  }

  /**
   * Check if vertex forms a valid ear (more robust version)
   */
  private static isValidEar(vertices: Point[], index: number): boolean {
    const n = vertices.length;
    const prev = vertices[(index - 1 + n) % n];
    const curr = vertices[index];
    const next = vertices[(index + 1) % n];

    // Check if angle is convex
    if (!this.isConvexAngle(prev, curr, next)) {
      return false;
    }

    // Check if any other vertex is inside this triangle
    for (let i = 0; i < n; i++) {
      if (i === (index - 1 + n) % n || i === index || i === (index + 1) % n) {
        continue;
      }

      if (this.isPointInTriangle(vertices[i], prev, curr, next)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if triangle intersects with polygon edges
   */
  private static triangleIntersectsPolygon(
    a: Point,
    b: Point,
    c: Point,
    vertices: Point[],
    skipIndex: number,
  ): boolean {
    const triangleEdges = [
      [a, b],
      [b, c],
      [c, a],
    ];

    for (let i = 0; i < vertices.length; i++) {
      if (i === skipIndex) {
        continue;
      }

      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];

      // Skip if this edge shares a vertex with the triangle
      if (
        this.isPointNear(p1, a) ||
        this.isPointNear(p1, b) ||
        this.isPointNear(p1, c) ||
        this.isPointNear(p2, a) ||
        this.isPointNear(p2, b) ||
        this.isPointNear(p2, c)
      ) {
        continue;
      }

      // Check intersection with triangle edges
      for (const [t1, t2] of triangleEdges) {
        if (this.lineSegmentsIntersect(p1, p2, t1, t2)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if two line segments intersect
   */
  private static lineSegmentsIntersect(
    p1: Point,
    p2: Point,
    p3: Point,
    p4: Point,
  ): boolean {
    const d1 = this.crossProduct(p3, p4, p1);
    const d2 = this.crossProduct(p3, p4, p2);
    const d3 = this.crossProduct(p1, p2, p3);
    const d4 = this.crossProduct(p1, p2, p4);

    if (
      ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate cross product for line intersection
   */
  private static crossProduct(a: Point, b: Point, c: Point): number {
    return (c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x);
  }

  /**
   * Centroid fan triangulation as ultimate fallback
   */
  private static centroidFanTriangulation(vertices: Point[]): Point[][] {
    if (vertices.length < 3) {
      return [];
    }

    const centroid = this.calculatePolygonCentroid(vertices);
    const triangles: Point[][] = [];

    for (let i = 0; i < vertices.length; i++) {
      const current = vertices[i];
      const next = vertices[(i + 1) % vertices.length];

      const area = this.calculateTriangleArea(centroid, current, next);
      if (area > this.MIN_TRIANGLE_AREA) {
        triangles.push([centroid, current, next]);
      }
    }

    return triangles;
  }

  /**
   * Calculate polygon centroid
   */
  private static calculatePolygonCentroid(vertices: Point[]): Point {
    let cx = 0;
    let cz = 0;
    let area = 0;

    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const cross = vertices[i].x * vertices[j].z - vertices[j].x * vertices[i].z;
      area += cross;
      cx += (vertices[i].x + vertices[j].x) * cross;
      cz += (vertices[i].z + vertices[j].z) * cross;
    }

    area /= 2;
    if (Math.abs(area) < this.PRECISION) {
      // Fallback to simple average
      return {
        x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
        z: vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length,
      };
    }

    return {
      x: cx / (6 * area),
      z: cz / (6 * area),
    };
  }

  /**
   * Simple fan triangulation as fallback
   */
  private static simpleTriangulation(vertices: Point[]): Point[][] {
    if (vertices.length < 3) {
      return [];
    }

    const triangles: Point[][] = [];
    const center = vertices[0];

    for (let i = 1; i < vertices.length - 1; i++) {
      triangles.push([center, vertices[i], vertices[i + 1]]);
    }

    return triangles;
  }

  /**
   * Constrained triangulation for polygons with holes
   */
  private static constrainedTriangulation(outer: Point[], holes: Point[][]): Point[][] {
    // This is a simplified implementation
    // In a production environment, you'd use a library like poly2tri or earcut

    // For now, use a simple approach: triangulate outer, then subtract hole areas
    const outerTriangles = this.advancedEarClipping(outer);

    // Filter out triangles that are inside holes
    return outerTriangles.filter((triangle) => {
      const centroid = this.calculateTriangleCentroid(triangle);
      return !holes.some((hole) => this.isPointInPolygon(centroid, hole));
    });
  }

  /**
   * Check if vertex is an ear (can be clipped) - legacy method
   */
  private static isEar(vertices: Point[], index: number): boolean {
    return this.isValidEar(vertices, index);
  }

  /**
   * Check if angle is convex
   */
  private static isConvexAngle(a: Point, b: Point, c: Point): boolean {
    const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    return cross > 0; // For counter-clockwise winding
  }

  /**
   * Check if point is inside triangle
   */
  private static isPointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
    const denom = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    const alpha = ((b.z - c.z) * (p.x - c.x) + (c.x - b.x) * (p.z - c.z)) / denom;
    const beta = ((c.z - a.z) * (p.x - c.x) + (a.x - c.x) * (p.z - c.z)) / denom;
    const gamma = 1 - alpha - beta;

    return alpha > 0 && beta > 0 && gamma > 0;
  }

  /**
   * Point-in-polygon test
   */
  private static isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    const x = point.x;
    const z = point.z;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        zi = polygon[i].z;
      const xj = polygon[j].x,
        zj = polygon[j].z;

      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Ensure counter-clockwise winding
   */
  private static ensureCounterClockwise(vertices: Point[]): Point[] {
    const signedArea = this.calculateSignedArea(vertices);
    return signedArea < 0 ? vertices : [...vertices].reverse();
  }

  /**
   * Ensure clockwise winding
   */
  private static ensureClockwise(vertices: Point[]): Point[] {
    const signedArea = this.calculateSignedArea(vertices);
    return signedArea > 0 ? vertices : [...vertices].reverse();
  }

  /**
   * Calculate signed area of polygon
   */
  private static calculateSignedArea(vertices: Point[]): number {
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += (vertices[j].x - vertices[i].x) * (vertices[j].z + vertices[i].z);
    }
    return area / 2;
  }

  /**
   * Calculate bounding box
   */
  private static calculateBounds(vertices: Point[]): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    width: number;
    height: number;
  } {
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;

    vertices.forEach((v) => {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minZ = Math.min(minZ, v.z);
      maxZ = Math.max(maxZ, v.z);
    });

    return {
      minX,
      maxX,
      minZ,
      maxZ,
      width: maxX - minX,
      height: maxZ - minZ,
    };
  }

  /**
   * Calculate triangle area
   */
  private static calculateTriangleArea(a: Point, b: Point, c: Point): number {
    return Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)) / 2;
  }

  /**
   * Calculate triangle centroid
   */
  private static calculateTriangleCentroid(triangle: Point[]): Point {
    return {
      x: (triangle[0].x + triangle[1].x + triangle[2].x) / 3,
      z: (triangle[0].z + triangle[1].z + triangle[2].z) / 3,
    };
  }

  /**
   * Check if two points are near each other
   */
  private static isPointNear(a: Point, b: Point): boolean {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz) < this.PRECISION;
  }
}
