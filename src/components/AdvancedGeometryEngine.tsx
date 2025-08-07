'use client';

import { Wall } from './Floorplan2DCanvas';

// Advanced Geometry Engine for Room Building
export class AdvancedGeometryEngine {
  private static PRECISION = 0.001; // 1mm precision
  private static SNAP_THRESHOLD = 0.001; // 1mm snap threshold - keep vertices close to original positions
  private static RATIONAL_ANGLES = [
    0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330,
  ]; // degrees

  // 1. Vertex Snapping with Precision Alignment
  static snapVertices(walls: Wall[]): Wall[] {
    const snappedWalls = [...walls];
    const vertexMap = new Map<string, { x: number; z: number }>();

    // Create vertex grid for snapping
    const createSnapKey = (point: { x: number; z: number }) => {
      const x = Math.round(point.x / this.SNAP_THRESHOLD) * this.SNAP_THRESHOLD;
      const z = Math.round(point.z / this.SNAP_THRESHOLD) * this.SNAP_THRESHOLD;
      return `${x.toFixed(3)},${z.toFixed(3)}`;
    };

    // First pass: collect all vertices and snap to grid
    snappedWalls.forEach((wall) => {
      const startKey = createSnapKey(wall.start);
      const endKey = createSnapKey(wall.end);

      if (!vertexMap.has(startKey)) {
        vertexMap.set(startKey, {
          x: Math.round(wall.start.x / this.SNAP_THRESHOLD) * this.SNAP_THRESHOLD,
          z: Math.round(wall.start.z / this.SNAP_THRESHOLD) * this.SNAP_THRESHOLD,
        });
      }
      if (!vertexMap.has(endKey)) {
        vertexMap.set(endKey, {
          x: Math.round(wall.end.x / this.SNAP_THRESHOLD) * this.SNAP_THRESHOLD,
          z: Math.round(wall.end.z / this.SNAP_THRESHOLD) * this.SNAP_THRESHOLD,
        });
      }
    });

    // Second pass: apply snapped vertices
    return snappedWalls.map((wall) => ({
      ...wall,
      start: vertexMap.get(createSnapKey(wall.start)) || wall.start,
      end: vertexMap.get(createSnapKey(wall.end)) || wall.end,
    }));
  }

  // 2. Detect and Fix Non-Planar Wall Segments
  static fixNonPlanarWalls(walls: Wall[]): Wall[] {
    return walls.map((wall) => {
      // Ensure all walls are at the same Y level (planar)
      const fixedWall = { ...wall };

      // Check for twisted segments (height variations)
      if (
        Math.abs(fixedWall.start.x - fixedWall.end.x) < this.PRECISION &&
        Math.abs(fixedWall.start.z - fixedWall.end.z) < this.PRECISION
      ) {
        // Zero-length wall, remove or fix
        console.warn('Zero-length wall detected:', fixedWall.id);
      }

      return fixedWall;
    });
  }

  // 3. Realign Diagonals to Rational Angles (Optional)
  static realignDiagonals(walls: Wall[], forceRationalAngles: boolean = false): Wall[] {
    return walls.map((wall) => {
      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.z - wall.start.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      if (length < this.PRECISION) {
        return wall;
      }

      // If not forcing rational angles, return wall as-is
      if (!forceRationalAngles) {
        return wall;
      }

      // Calculate current angle
      const currentAngle = (Math.atan2(dz, dx) * 180) / Math.PI;
      const normalizedAngle = ((currentAngle % 360) + 360) % 360;

      // Find nearest rational angle
      let nearestAngle = this.RATIONAL_ANGLES[0];
      let minDiff = Math.abs(normalizedAngle - nearestAngle);

      for (const angle of this.RATIONAL_ANGLES) {
        const diff = Math.min(
          Math.abs(normalizedAngle - angle),
          Math.abs(normalizedAngle - angle + 360),
          Math.abs(normalizedAngle - angle - 360),
        );
        if (diff < minDiff) {
          minDiff = diff;
          nearestAngle = angle;
        }
      }

      // Only snap if within reasonable threshold (15 degrees)
      if (minDiff <= 15) {
        const radians = (nearestAngle * Math.PI) / 180;
        return {
          ...wall,
          end: {
            x: wall.start.x + length * Math.cos(radians),
            z: wall.start.z + length * Math.sin(radians),
          },
        };
      }

      return wall;
    });
  }

  // 4. Smooth Wall Transitions and Joints
  static smoothWallTransitions(walls: Wall[]): Wall[] {
    const smoothedWalls = [...walls];
    const connectionMap = this.buildConnectionMap(smoothedWalls);

    // Process each connection point
    for (const [pointKey, connections] of connectionMap.entries()) {
      if (connections.length === 2) {
        // Standard corner - ensure clean joint
        const [wall1, wall2] = connections;
        const point = this.parsePointKey(pointKey);

        // Ensure both walls connect exactly at this point
        if (this.distance(wall1.start, point) < this.PRECISION) {
          wall1.start = point;
        } else if (this.distance(wall1.end, point) < this.PRECISION) {
          wall1.end = point;
        }

        if (this.distance(wall2.start, point) < this.PRECISION) {
          wall2.start = point;
        } else if (this.distance(wall2.end, point) < this.PRECISION) {
          wall2.end = point;
        }
      }
    }

    return smoothedWalls;
  }

  // 5. Eliminate Z-Fighting and Rendering Artifacts
  static eliminateZFighting(walls: Wall[]): Wall[] {
    const processedWalls = [...walls];

    // Ensure minimum wall thickness to prevent z-fighting
    const MIN_THICKNESS = 0.05; // 5cm minimum

    return processedWalls.map((wall) => ({
      ...wall,
      thickness: Math.max(wall.thickness, MIN_THICKNESS),
      height: Math.max(wall.height, 0.1), // Minimum 10cm height
    }));
  }

  // 6. Optimize Window Placements
  static optimizeWindowPlacements(walls: Wall[]): {
    walls: Wall[];
    windows: WindowPlacement[];
  } {
    const windows: WindowPlacement[] = [];

    const optimizedWalls = walls.map((wall) => {
      const wallLength = this.distance(wall.start, wall.end);

      // Only place windows in walls longer than 2.5m
      if (wallLength > 2.5) {
        const windowWidth = Math.min(1.5, wallLength * 0.4); // Max 40% of wall length
        const windowHeight = 1.2;
        const windowBottom = 0.8;

        // Center the window
        const centerX = (wall.start.x + wall.end.x) / 2;
        const centerZ = (wall.start.z + wall.end.z) / 2;

        windows.push({
          wallId: wall.id,
          position: { x: centerX, z: centerZ },
          width: windowWidth,
          height: windowHeight,
          bottomHeight: windowBottom,
        });
      }

      return wall;
    });

    return { walls: optimizedWalls, windows };
  }

  // 6b. Optimize Door Placements (simple heuristic similar to Blueprint3D)
  static optimizeDoorPlacements(walls: Wall[]): {
    walls: Wall[];
    doors: DoorPlacement[];
  } {
    const doors: DoorPlacement[] = [];

    // Build vertex connection degrees to detect interior walls (junctions on both ends)
    const map = this.buildConnectionMap(walls);

    const MIN_WALL_FOR_DOOR = 2.0; // meters
    walls.forEach((wall) => {
      const length = this.distance(wall.start, wall.end);
      if (length < MIN_WALL_FOR_DOOR) {
        return;
      }

      const startKey = this.pointKey(wall.start);
      const endKey = this.pointKey(wall.end);
      const degStart = map.get(startKey)?.length ?? 0;
      const degEnd = map.get(endKey)?.length ?? 0;

      const isLikelyInterior = degStart >= 2 && degEnd >= 2;
      // Prefer placing doors on interior walls; fall back to longer external walls
      if (!isLikelyInterior && length < 3.0) {
        return;
      }

      // Place a single door roughly 20% from start to avoid exact center collisions
      const t = 0.2 + Math.random() * 0.6; // 20%-80%
      const pos = {
        x: wall.start.x + (wall.end.x - wall.start.x) * t,
        z: wall.start.z + (wall.end.z - wall.start.z) * t,
      };

      const width = Math.min(0.9, Math.max(0.8, length * 0.25));
      const height = 2.0;
      const bottomHeight = 0.0;
      const hinge: 'left' | 'right' = Math.random() > 0.5 ? 'left' : 'right';
      const swingAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3); // 60°

      doors.push({
        wallId: wall.id,
        position: pos,
        width,
        height,
        bottomHeight,
        hinge,
        swingAngle,
      });
    });

    return { walls, doors };
  }

  // 6c. Find closed floor loops (simple cycles) for multi-room floors
  static findFloorLoops(walls: Wall[]): Array<{ vertices: { x: number; z: number }[] }> {
    if (walls.length < 3) {
      return [];
    }

    const conn = this.buildConnectionMap(walls);
    const degree2Keys = new Set(
      Array.from(conn.entries())
        .filter(([, arr]) => arr.length === 2)
        .map(([k]) => k),
    );

    // Build adjacency only through degree-2 vertices
    const neighbors = new Map<string, string[]>();
    walls.forEach((w) => {
      const a = this.pointKey(w.start);
      const b = this.pointKey(w.end);
      if (degree2Keys.has(a) && degree2Keys.has(b)) {
        if (!neighbors.has(a)) {
          neighbors.set(a, []);
        }
        if (!neighbors.has(b)) {
          neighbors.set(b, []);
        }
        neighbors.get(a)!.push(b);
        neighbors.get(b)!.push(a);
      }
    });

    const visitedEdges = new Set<string>();
    const loops: Array<{ vertices: { x: number; z: number }[] }> = [];

    const keyEdge = (u: string, v: string) => `${u}->${v}`;
    const parse = (k: string) => this.parsePointKey(k);

    for (const startKey of neighbors.keys()) {
      for (const nextKey of neighbors.get(startKey) || []) {
        const eKey = keyEdge(startKey, nextKey);
        if (visitedEdges.has(eKey)) {
          continue;
        }

        const path: string[] = [startKey, nextKey];
        visitedEdges.add(eKey);
        let curr = nextKey;
        let prev = startKey;

        while (true) {
          const neigh = (neighbors.get(curr) || []).filter((x) => x !== prev);
          if (neigh.length === 0) {
            break;
          }
          const nxt = neigh[0]; // deterministic follow
          path.push(nxt);
          visitedEdges.add(keyEdge(curr, nxt));
          prev = curr;
          curr = nxt;
          if (curr === startKey) {
            break;
          }
        }

        if (curr === startKey && path.length >= 4) {
          // Convert to vertices and normalize orientation CCW
          const vertices = path.slice(0, -1).map(parse);
          const area = this.calculatePolygonArea(vertices);
          if (area > 0.05) {
            loops.push({ vertices: this.ensureCounterClockwise(vertices) });
          }
        }
      }
    }

    // Deduplicate loops by canonical string
    const canon = (verts: { x: number; z: number }[]) => {
      const strs = verts.map((v) => `${v.x.toFixed(3)},${v.z.toFixed(3)}`);
      // rotate to minimal lexicographic start
      let best = strs;
      for (let i = 1; i < strs.length; i++) {
        const rotated = [...strs.slice(i), ...strs.slice(0, i)];
        if (rotated.join('|') < best.join('|')) {
          best = rotated;
        }
      }
      return best.join('|');
    };
    const seen = new Set<string>();
    const unique: Array<{ vertices: { x: number; z: number }[] }> = [];
    for (const lp of loops) {
      const id = canon(lp.vertices);
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      unique.push(lp);
    }
    return unique;
  }

  // 7. Validate Polygon Topology
  static validateTopology(walls: Wall[]): TopologyValidation {
    const validation: TopologyValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      metrics: {
        totalPerimeter: 0,
        wallCount: walls.length,
        vertexCount: 0,
        area: 0,
      },
    };

    // Check for closed loop
    const connectionMap = this.buildConnectionMap(walls);
    let openEdges = 0;
    let _invalidConnections = 0;

    for (const [pointKey, connections] of connectionMap.entries()) {
      if (connections.length === 1) {
        openEdges++;
        validation.errors.push(`Open edge at ${pointKey}`);
      } else if (connections.length > 2) {
        _invalidConnections++;
        validation.warnings.push(
          `Complex junction at ${pointKey} (${connections.length} connections)`,
        );
      }
    }

    validation.metrics.vertexCount = connectionMap.size;
    validation.isValid = openEdges === 0;

    // Calculate perimeter
    validation.metrics.totalPerimeter = walls.reduce(
      (sum, wall) => sum + this.distance(wall.start, wall.end),
      0,
    );

    // Calculate area if valid
    if (validation.isValid) {
      const vertices = this.getOrderedVertices(walls);
      validation.metrics.area = this.calculatePolygonArea(vertices);
    }

    return validation;
  }

  // 8. Rebuild Mesh with Optimized UVs and Normals
  static rebuildOptimizedMesh(walls: Wall[]): OptimizedMeshData {
    const meshData: OptimizedMeshData = {
      vertices: [],
      indices: [],
      normals: [],
      uvs: [],
      materials: [],
    };

    walls.forEach((wall, _wallIndex) => {
      const wallLength = this.distance(wall.start, wall.end);
      if (wallLength < this.PRECISION) {
        return;
      }

      // Calculate wall direction and normal
      const direction = {
        x: (wall.end.x - wall.start.x) / wallLength,
        z: (wall.end.z - wall.start.z) / wallLength,
      };

      const normal = { x: -direction.z, z: direction.x }; // Perpendicular

      // Create wall geometry
      const thickness = wall.thickness / 2;
      const height = wall.height;

      // Wall vertices (8 vertices for a box)
      const wallVertices = [
        // Bottom face
        {
          x: wall.start.x - normal.x * thickness,
          y: 0,
          z: wall.start.z - normal.z * thickness,
        },
        {
          x: wall.end.x - normal.x * thickness,
          y: 0,
          z: wall.end.z - normal.z * thickness,
        },
        {
          x: wall.end.x + normal.x * thickness,
          y: 0,
          z: wall.end.z + normal.z * thickness,
        },
        {
          x: wall.start.x + normal.x * thickness,
          y: 0,
          z: wall.start.z + normal.z * thickness,
        },
        // Top face
        {
          x: wall.start.x - normal.x * thickness,
          y: height,
          z: wall.start.z - normal.z * thickness,
        },
        {
          x: wall.end.x - normal.x * thickness,
          y: height,
          z: wall.end.z - normal.z * thickness,
        },
        {
          x: wall.end.x + normal.x * thickness,
          y: height,
          z: wall.end.z + normal.z * thickness,
        },
        {
          x: wall.start.x + normal.x * thickness,
          y: height,
          z: wall.start.z + normal.z * thickness,
        },
      ];

      const baseIndex = meshData.vertices.length / 3;

      // Add vertices
      wallVertices.forEach((v) => {
        meshData.vertices.push(v.x, v.y, v.z);
      });

      // Add indices for faces (12 triangles for a box)
      const faceIndices = [
        // Bottom face
        [0, 1, 2],
        [0, 2, 3],
        // Top face
        [4, 6, 5],
        [4, 7, 6],
        // Side faces
        [0, 4, 5],
        [0, 5, 1],
        [1, 5, 6],
        [1, 6, 2],
        [2, 6, 7],
        [2, 7, 3],
        [3, 7, 4],
        [3, 4, 0],
      ];

      faceIndices.forEach((face) => {
        meshData.indices.push(
          baseIndex + face[0],
          baseIndex + face[1],
          baseIndex + face[2],
        );
      });

      // Add normals and UVs
      const faceNormals = [
        [0, -1, 0],
        [0, -1, 0], // Bottom
        [0, 1, 0],
        [0, 1, 0], // Top
        [-normal.x, 0, -normal.z],
        [-normal.x, 0, -normal.z], // Side 1
        [direction.x, 0, direction.z],
        [direction.x, 0, direction.z], // Side 2
        [normal.x, 0, normal.z],
        [normal.x, 0, normal.z], // Side 3
        [-direction.x, 0, -direction.z],
        [-direction.x, 0, -direction.z], // Side 4
      ];

      wallVertices.forEach((_, i) => {
        const normalIndex = Math.floor(i / 2);
        meshData.normals.push(...faceNormals[normalIndex]);

        // UV coordinates
        const u = ((i % 2) * wallLength) / 4; // Scale by wall length
        const v = i < 4 ? 0 : 1; // Bottom vs top
        meshData.uvs.push(u, v);
      });
    });

    return meshData;
  }

  // 9. Visual Consistency Check Between 2D and 3D
  static performConsistencyCheck(walls: Wall[]): ConsistencyReport {
    const report: ConsistencyReport = {
      isConsistent: true,
      discrepancies: [],
      recommendations: [],
    };

    walls.forEach((wall) => {
      // Check wall thickness consistency
      if (wall.thickness < 0.05 || wall.thickness > 0.5) {
        report.discrepancies.push({
          wallId: wall.id,
          type: 'thickness',
          message: `Wall thickness ${wall.thickness}m is outside normal range (0.05-0.5m)`,
        });
        report.recommendations.push(`Adjust wall ${wall.id} thickness to 0.2m`);
      }

      // Check wall height consistency
      if (wall.height < 2.0 || wall.height > 4.0) {
        report.discrepancies.push({
          wallId: wall.id,
          type: 'height',
          message: `Wall height ${wall.height}m is outside normal range (2.0-4.0m)`,
        });
        report.recommendations.push(`Adjust wall ${wall.id} height to 2.5m`);
      }

      // Check wall length
      const length = this.distance(wall.start, wall.end);
      if (length < 0.1) {
        report.discrepancies.push({
          wallId: wall.id,
          type: 'length',
          message: `Wall length ${length.toFixed(3)}m is too short`,
        });
        report.recommendations.push(`Remove or extend wall ${wall.id}`);
      }
    });

    report.isConsistent = report.discrepancies.length === 0;
    return report;
  }

  // Helpers exposed from private static utilities used above
  static buildConnectionMap(walls: Wall[]): Map<string, Wall[]> {
    const map = new Map<string, Wall[]>();
    walls.forEach((w) => {
      const a = this.pointKey(w.start);
      const b = this.pointKey(w.end);
      if (!map.has(a)) {
        map.set(a, []);
      }
      if (!map.has(b)) {
        map.set(b, []);
      }
      map.get(a)!.push(w);
      map.get(b)!.push(w);
    });
    return map;
  }

  private static pointKey(p: { x: number; z: number }): string {
    return `${p.x.toFixed(3)},${p.z.toFixed(3)}`;
  }

  private static parsePointKey(k: string): { x: number; z: number } {
    const [xs, zs] = k.split(',');
    return { x: parseFloat(xs), z: parseFloat(zs) };
  }

  // 10. Generate Room Collider and Bounding Box
  static generateColliderAndBounds(walls: Wall[]): ColliderData {
    const vertices = this.getOrderedVertices(walls);

    // Calculate bounding box
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;
    let maxHeight = 0;

    vertices.forEach((v) => {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minZ = Math.min(minZ, v.z);
      maxZ = Math.max(maxZ, v.z);
    });

    walls.forEach((wall) => {
      maxHeight = Math.max(maxHeight, wall.height);
    });

    // Generate collision mesh
    const collisionVertices: number[] = [];
    const collisionIndices: number[] = [];

    // Floor collision
    for (let i = 1; i < vertices.length - 1; i++) {
      const baseIndex = collisionVertices.length / 3;

      // Add triangle vertices
      collisionVertices.push(
        vertices[0].x,
        0,
        vertices[0].z,
        vertices[i].x,
        0,
        vertices[i].z,
        vertices[i + 1].x,
        0,
        vertices[i + 1].z,
      );

      collisionIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    }

    return {
      boundingBox: {
        min: { x: minX, y: 0, z: minZ },
        max: { x: maxX, y: maxHeight, z: maxZ },
      },
      collisionMesh: {
        vertices: collisionVertices,
        indices: collisionIndices,
      },
      interactionZones: walls.map((wall) => ({
        wallId: wall.id,
        center: {
          x: (wall.start.x + wall.end.x) / 2,
          y: wall.height / 2,
          z: (wall.start.z + wall.end.z) / 2,
        },
        size: {
          x: this.distance(wall.start, wall.end),
          y: wall.height,
          z: wall.thickness,
        },
      })),
    };
  }

  // Helper Methods
  private static distance(
    a: { x: number; z: number },
    b: { x: number; z: number },
  ): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
  }

  // Legacy internal variant kept for existing methods below
  private static _buildConnectionMapLegacy(walls: Wall[]): Map<string, Wall[]> {
    const map = new Map<string, Wall[]>();

    walls.forEach((wall) => {
      const startKey = `${wall.start.x.toFixed(3)},${wall.start.z.toFixed(3)}`;
      const endKey = `${wall.end.x.toFixed(3)},${wall.end.z.toFixed(3)}`;

      if (!map.has(startKey)) {
        map.set(startKey, []);
      }
      if (!map.has(endKey)) {
        map.set(endKey, []);
      }

      map.get(startKey)!.push(wall);
      map.get(endKey)!.push(wall);
    });

    return map;
  }

  // Compatibility alias for earlier code paths
  private static parsePointKeyCompat(key: string): { x: number; z: number } {
    const [x, z] = key.split(',').map(Number);
    return { x, z };
  }

  private static getOrderedVertices(walls: Wall[]): { x: number; z: number }[] {
    if (walls.length === 0) {
      return [];
    }

    const connections = this._buildConnectionMapLegacy(walls);
    const visited = new Set<string>();
    const vertices: { x: number; z: number }[] = [];

    // Start from any vertex
    const startKey = connections.keys().next().value;
    if (!startKey) {
      return [];
    }

    let currentKey = startKey;
    let previousWall: Wall | null = null;

    while (currentKey && !visited.has(currentKey)) {
      visited.add(currentKey);
      vertices.push(this.parsePointKey(currentKey));

      const connectedWalls = connections.get(currentKey) || [];
      const nextWall = connectedWalls.find((w) => w !== previousWall);

      if (!nextWall) {
        break;
      }

      // Find the other end of this wall
      const currentPoint = this.parsePointKey(currentKey);
      const nextKey =
        this.distance(nextWall.start, currentPoint) < this.PRECISION
          ? `${nextWall.end.x.toFixed(3)},${nextWall.end.z.toFixed(3)}`
          : `${nextWall.start.x.toFixed(3)},${nextWall.start.z.toFixed(3)}`;

      previousWall = nextWall;
      currentKey = nextKey;
    }

    return vertices;
  }

  private static calculatePolygonArea(vertices: { x: number; z: number }[]): number {
    if (vertices.length < 3) {
      return 0;
    }

    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].z;
      area -= vertices[j].x * vertices[i].z;
    }

    return area / 2; // Note: Not using Math.abs() to preserve sign for orientation
  }

  private static ensureCounterClockwise(vertices: { x: number; z: number }[]): { x: number; z: number }[] {
    const area = this.calculatePolygonArea(vertices);
    if (area < 0) {
      // If area is negative, the vertices are clockwise, so reverse them
      return [...vertices].reverse();
    }
    return vertices;
  }
}

// Type Definitions
export interface WindowPlacement {
  wallId: string;
  position: { x: number; z: number };
  width: number;
  height: number;
  bottomHeight: number;
}

export interface DoorPlacement {
  wallId: string;
  position: { x: number; z: number };
  width: number;
  height: number;
  bottomHeight: number; // always 0 for doors
  hinge: 'left' | 'right';
  swingAngle: number; // radians, positive CCW
}

export interface TopologyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalPerimeter: number;
    wallCount: number;
    vertexCount: number;
    area: number;
  };
}

export interface OptimizedMeshData {
  vertices: number[];
  indices: number[];
  normals: number[];
  uvs: number[];
  materials: string[];
}

export interface ConsistencyReport {
  isConsistent: boolean;
  discrepancies: Array<{
    wallId: string;
    type: string;
    message: string;
  }>;
  recommendations: string[];
}

export interface ColliderData {
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  collisionMesh: {
    vertices: number[];
    indices: number[];
  };
  interactionZones: Array<{
    wallId: string;
    center: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
  }>;
}

export default AdvancedGeometryEngine;
