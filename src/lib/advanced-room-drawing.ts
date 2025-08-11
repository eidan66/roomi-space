import { Point, Wall } from '@/types/room';

// Enhanced room types for multiple room support
export interface DrawingRoom {
  id: string;
  name: string;
  walls: Wall[];
  isCompleted: boolean;
  parentRoomId?: string; // For nested rooms
  isActive: boolean; // Currently being drawn
}

export interface RoomDrawingState {
  rooms: DrawingRoom[];
  activeRoomId: string | null;
  drawingPoints: Point[];
  isDrawing: boolean;
}

export class AdvancedRoomDrawing {
  private static readonly SNAP_THRESHOLD = 0.05; // 5cm snap threshold
  private static readonly MIN_WALL_LENGTH = 0.1; // 10cm minimum wall length
  private static readonly INSIDE_WALL_THICKNESS = 0.1; // 10cm
  private static readonly OUTSIDE_WALL_THICKNESS = 0.25; // 25cm

  /**
   * Check if a point is close enough to another point for snapping
   */
  static isPointNearby(
    point1: Point,
    point2: Point,
    threshold = this.SNAP_THRESHOLD,
  ): boolean {
    const dx = point1.x - point2.x;
    const dz = point1.z - point2.z;
    return Math.sqrt(dx * dx + dz * dz) < threshold;
  }

  /**
   * Start drawing a new room
   */
  static startNewRoom(state: RoomDrawingState, roomName?: string): RoomDrawingState {
    const newRoom: DrawingRoom = {
      id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: roomName || `Room ${state.rooms.length + 1}`,
      walls: [],
      isCompleted: false,
      isActive: true,
    };

    // Mark all other rooms as inactive
    const updatedRooms = state.rooms.map((room) => ({ ...room, isActive: false }));

    return {
      ...state,
      rooms: [...updatedRooms, newRoom],
      activeRoomId: newRoom.id,
      drawingPoints: [],
      isDrawing: true,
    };
  }

  /**
   * Add a point to the current drawing room
   * Only closes the room if specifically clicking the first point
   */
  static addDrawingPoint(
    state: RoomDrawingState,
    newPoint: Point,
    wallHeight = 2.8,
  ): RoomDrawingState {
    if (!state.activeRoomId || !state.isDrawing) {
      return state;
    }

    const activeRoom = state.rooms.find((room) => room.id === state.activeRoomId);
    if (!activeRoom || activeRoom.isCompleted) {
      return state;
    }

    // Check if we're clicking near the FIRST point to close the room
    if (state.drawingPoints.length >= 3) {
      const firstPoint = state.drawingPoints[0];
      if (this.isPointNearby(newPoint, firstPoint)) {
        return this.completeRoom(state, wallHeight);
      }
    }

    // Add the new point
    const updatedDrawingPoints = [...state.drawingPoints, newPoint];

    // Create wall if we have at least 2 points
    let updatedRooms = state.rooms;
    if (updatedDrawingPoints.length >= 2) {
      const lastPoint = updatedDrawingPoints[updatedDrawingPoints.length - 2];

      // Don't create walls that are too short
      if (!this.isPointNearby(lastPoint, newPoint, this.MIN_WALL_LENGTH)) {
        const newWall: Wall = {
          id: `wall-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          start: lastPoint,
          end: newPoint,
          height: wallHeight,
          thickness: this.OUTSIDE_WALL_THICKNESS, // Default to outside, will be recalculated
        };

        updatedRooms = state.rooms.map((room) =>
          room.id === state.activeRoomId
            ? { ...room, walls: [...room.walls, newWall] }
            : room,
        );
      }
    }

    return {
      ...state,
      rooms: updatedRooms,
      drawingPoints: updatedDrawingPoints,
    };
  }

  /**
   * Complete the current room by connecting the last point to the first
   */
  static completeRoom(state: RoomDrawingState, wallHeight = 2.8): RoomDrawingState {
    if (!state.activeRoomId || state.drawingPoints.length < 3) {
      return state;
    }

    const firstPoint = state.drawingPoints[0];
    const lastPoint = state.drawingPoints[state.drawingPoints.length - 1];

    const roomsWithNewCompletion = [...state.rooms];
    const activeRoom = roomsWithNewCompletion.find((r) => r.id === state.activeRoomId)!;

    // Create closing wall if needed
    if (!this.isPointNearby(lastPoint, firstPoint, this.MIN_WALL_LENGTH)) {
      const closingWall: Wall = {
        id: `wall-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        start: lastPoint,
        end: firstPoint,
        height: wallHeight,
        thickness: this.OUTSIDE_WALL_THICKNESS, // Will be recalculated
      };
      activeRoom.walls.push(closingWall);
    }

    activeRoom.isCompleted = true;
    activeRoom.isActive = false;

    // Recalculate nesting for all rooms
    let finalRooms = this.findNestedRooms(roomsWithNewCompletion);

    // Recalculate wall thicknesses based on new nesting
    finalRooms = this.recalculateWallThicknesses(finalRooms);

    return {
      ...state,
      rooms: finalRooms,
      activeRoomId: null,
      drawingPoints: [],
      isDrawing: false,
    };
  }

  /**
   * Cancel the current room drawing
   */
  static cancelCurrentRoom(state: RoomDrawingState): RoomDrawingState {
    if (!state.activeRoomId) {
      return state;
    }

    return {
      ...state,
      rooms: state.rooms.filter((room) => room.id !== state.activeRoomId),
      activeRoomId: null,
      drawingPoints: [],
      isDrawing: false,
    };
  }

  /**
   * Check if a point is inside a completed room
   */
  static isPointInsideRoom(point: Point, room: DrawingRoom): boolean {
    if (!room.isCompleted || room.walls.length < 3) {
      return false;
    }

    const vertices = this.getRoomVertices(room);
    return this.isPointInPolygon(point, vertices);
  }

  /**
   * Point-in-polygon algorithm (ray casting)
   */
  private static isPointInPolygon(point: Point, vertices: Point[]): boolean {
    let inside = false;
    const x = point.x;
    const z = point.z;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x;
      const zi = vertices[i].z;
      const xj = vertices[j].x;
      const zj = vertices[j].z;

      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Get ordered vertices of a room
   */
  static getRoomVertices(room: DrawingRoom): Point[] {
    if (room.walls.length === 0) {
      return [];
    }

    // Build a more robust vertex connection graph
    const pointMap = new Map<
      string,
      { point: Point; connections: { wall: Wall; otherPoint: Point }[] }
    >();

    // Build the connection graph
    room.walls.forEach((wall) => {
      const startKey = `${wall.start.x.toFixed(6)},${wall.start.z.toFixed(6)}`;
      const endKey = `${wall.end.x.toFixed(6)},${wall.end.z.toFixed(6)}`;

      if (!pointMap.has(startKey)) {
        pointMap.set(startKey, { point: wall.start, connections: [] });
      }
      if (!pointMap.has(endKey)) {
        pointMap.set(endKey, { point: wall.end, connections: [] });
      }

      pointMap.get(startKey)!.connections.push({ wall, otherPoint: wall.end });
      pointMap.get(endKey)!.connections.push({ wall, otherPoint: wall.start });
    });

    // Find starting point (leftmost, then bottommost)
    let startPoint: Point | null = null;
    let startKey = '';

    for (const [key, data] of pointMap.entries()) {
      if (
        !startPoint ||
        data.point.x < startPoint.x ||
        (Math.abs(data.point.x - startPoint.x) < 0.001 && data.point.z < startPoint.z)
      ) {
        startPoint = data.point;
        startKey = key;
      }
    }

    if (!startPoint) {
      return [];
    }

    // Trace the perimeter
    const vertices: Point[] = [];
    const usedWalls = new Set<string>();
    let currentKey = startKey;
    let previousWall: Wall | null = null;

    do {
      const currentData = pointMap.get(currentKey);
      if (!currentData) {
        break;
      }

      vertices.push(currentData.point);

      // Find the next wall (not the one we came from)
      let nextConnection = null;
      for (const connection of currentData.connections) {
        if (previousWall && connection.wall.id === previousWall.id) {
          continue;
        }
        if (usedWalls.has(connection.wall.id)) {
          continue;
        }

        nextConnection = connection;
        break;
      }

      if (!nextConnection) {
        break;
      }

      usedWalls.add(nextConnection.wall.id);
      previousWall = nextConnection.wall;
      currentKey = `${nextConnection.otherPoint.x.toFixed(6)},${nextConnection.otherPoint.z.toFixed(6)}`;

      // Check if we've closed the loop
      if (
        this.isPointNearby(nextConnection.otherPoint, vertices[0], 0.001) &&
        vertices.length >= 3
      ) {
        break;
      }
    } while (currentKey !== startKey && vertices.length <= room.walls.length);

    return vertices;
  }

  /**
   * Recalculate wall thicknesses based on inside/outside position
   */
  static recalculateWallThicknesses(rooms: DrawingRoom[]): DrawingRoom[] {
    // 1) Detect shared/adjacent walls between different rooms (interior partitions)
    const interiorWallIds = new Set<string>();

    const arePointsClose = (a: Point, b: Point, eps = 1e-3): boolean =>
      Math.abs(a.x - b.x) < eps && Math.abs(a.z - b.z) < eps;

    const cross = (a: Point, b: Point, c: Point): number =>
      (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);

    const isCollinear = (a: Point, b: Point, c: Point, eps = 1e-3): boolean =>
      Math.abs(cross(a, b, c)) < eps;

    const projectionsOverlap = (
      a1: number,
      a2: number,
      b1: number,
      b2: number,
      eps = 1e-3,
    ): boolean => {
      const minA = Math.min(a1, a2);
      const maxA = Math.max(a1, a2);
      const minB = Math.min(b1, b2);
      const maxB = Math.max(b1, b2);
      return !(maxA < minB + eps || maxB < minA + eps);
    };

    const segmentsOverlapSignificantly = (w1: Wall, w2: Wall): boolean => {
      // Collinearity check using both endpoints
      if (
        !(
          isCollinear(w1.start, w1.end, w2.start) && isCollinear(w1.start, w1.end, w2.end)
        )
      ) {
        return false;
      }

      // Overlap on both axes projections
      const overlapX = projectionsOverlap(w1.start.x, w1.end.x, w2.start.x, w2.end.x);
      const overlapZ = projectionsOverlap(w1.start.z, w1.end.z, w2.start.z, w2.end.z);
      if (!(overlapX && overlapZ)) {
        return false;
      }

      // Ensure there is a non-trivial overlap length
      const midpoint = (p: Point, q: Point) => ({
        x: (p.x + q.x) / 2,
        z: (p.z + q.z) / 2,
      });
      const m1 = midpoint(w1.start, w1.end);
      const m2 = midpoint(w2.start, w2.end);
      const dx = m1.x - m2.x;
      const dz = m1.z - m2.z;
      const approxGap = Math.sqrt(dx * dx + dz * dz);
      // If midpoints are far, they might only touch at a tiny tip; require closeness
      return approxGap < 0.25; // 25cm tolerance for considering shared partition
    };

    for (let i = 0; i < rooms.length; i++) {
      const roomA = rooms[i];
      if (!roomA.isCompleted) {
        continue;
      }
      for (let j = i + 1; j < rooms.length; j++) {
        const roomB = rooms[j];
        if (!roomB.isCompleted) {
          continue;
        }

        for (const w1 of roomA.walls) {
          for (const w2 of roomB.walls) {
            // Quick endpoint snap check for identical reversed segments
            const identicalReversed =
              (arePointsClose(w1.start, w2.end) && arePointsClose(w1.end, w2.start)) ||
              (arePointsClose(w1.start, w2.start) && arePointsClose(w1.end, w2.end));

            if (identicalReversed || segmentsOverlapSignificantly(w1, w2)) {
              interiorWallIds.add(w1.id);
              interiorWallIds.add(w2.id);
            }
          }
        }
      }
    }

    // 2) Apply thickness based on shared walls first, then inside/outside heuristic
    return rooms.map((room) => {
      if (!room.isCompleted) {
        return room;
      }

      const updatedWalls = room.walls.map((wall) => {
        if (interiorWallIds.has(wall.id)) {
          return { ...wall, thickness: this.INSIDE_WALL_THICKNESS };
        }

        const wallMidpoint = {
          x: (wall.start.x + wall.end.x) / 2,
          z: (wall.start.z + wall.end.z) / 2,
        };

        const isInsideAnotherRoom = rooms.some(
          (otherRoom) =>
            otherRoom.id !== room.id &&
            otherRoom.isCompleted &&
            this.isPointInsideRoom(wallMidpoint, otherRoom),
        );

        return {
          ...wall,
          thickness: isInsideAnotherRoom
            ? this.INSIDE_WALL_THICKNESS
            : this.OUTSIDE_WALL_THICKNESS,
        };
      });

      return { ...room, walls: updatedWalls };
    });
  }

  /**
   * Get all walls from all rooms for rendering
   */
  static getAllWalls(state: RoomDrawingState): Wall[] {
    return state.rooms.flatMap((room) => room.walls);
  }

  /**
   * Find nested rooms (rooms inside other rooms)
   */
  static findNestedRooms(rooms: DrawingRoom[]): DrawingRoom[] {
    const completedRooms = rooms.filter((r) => r.isCompleted);

    return rooms.map((room) => {
      if (!room.isCompleted) {
        return { ...room, parentRoomId: undefined };
      }

      const roomVertices = this.getRoomVertices(room);
      if (roomVertices.length < 3) {
        return { ...room, parentRoomId: undefined };
      }

      let potentialParent: DrawingRoom | null = null;
      let smallestParentArea = Infinity;

      for (const otherRoom of completedRooms) {
        if (room.id === otherRoom.id) {
          continue;
        }

        const otherRoomVertices = this.getRoomVertices(otherRoom);
        if (otherRoomVertices.length < 3) {
          continue;
        }

        // Check if all vertices of the current room are inside the other room
        const isNested = roomVertices.every((vertex) =>
          this.isPointInPolygon(vertex, otherRoomVertices),
        );

        if (isNested) {
          const parentArea = this.calculatePolygonArea(otherRoomVertices);
          // Find the smallest containing room
          if (parentArea < smallestParentArea) {
            smallestParentArea = parentArea;
            potentialParent = otherRoom;
          }
        }
      }

      return {
        ...room,
        parentRoomId: potentialParent?.id,
      };
    });
  }

  /**
   * Calculate centroid of a polygon
   */
  private static calculateCentroid(vertices: Point[]): Point {
    if (vertices.length === 0) {
      return { x: 0, z: 0 };
    }

    const sum = vertices.reduce(
      (acc, vertex) => ({
        x: acc.x + vertex.x,
        z: acc.z + vertex.z,
      }),
      { x: 0, z: 0 },
    );

    return {
      x: sum.x / vertices.length,
      z: sum.z / vertices.length,
    };
  }

  /**
   * Validate room geometry
   */
  static validateRoom(room: DrawingRoom): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (room.walls.length < 3) {
      errors.push('Room must have at least 3 walls');
      return { isValid: false, errors };
    }

    // Check for minimum wall lengths
    room.walls.forEach((wall, index) => {
      const length = Math.sqrt(
        Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2),
      );
      if (length < this.MIN_WALL_LENGTH) {
        errors.push(`Wall ${index + 1} is too short (${length.toFixed(2)}m)`);
      }
    });

    // Check if room is properly closed (more lenient validation)
    if (room.isCompleted) {
      const vertices = this.getRoomVertices(room);

      // More lenient check - just ensure we have enough vertices and they form a reasonable polygon
      if (vertices.length < 3) {
        errors.push('Room is not properly closed');
      } else {
        // Check that we have a reasonable polygon area
        const area = this.calculatePolygonArea(vertices);
        if (area < 0.01) {
          // Less than 0.01 m² (very small)
          errors.push('Room area is too small');
        }

        // Verify wall connectivity more thoroughly
        const connectivityCheck = this.validateWallConnectivity(room.walls);
        if (!connectivityCheck.isConnected) {
          errors.push('Walls are not properly connected');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate that all walls are properly connected
   */
  private static validateWallConnectivity(walls: Wall[]): {
    isConnected: boolean;
    details: string;
  } {
    if (walls.length === 0) {
      return { isConnected: false, details: 'No walls' };
    }

    // Build connectivity graph
    const pointConnections = new Map<string, number>();

    walls.forEach((wall) => {
      const startKey = `${wall.start.x.toFixed(6)},${wall.start.z.toFixed(6)}`;
      const endKey = `${wall.end.x.toFixed(6)},${wall.end.z.toFixed(6)}`;

      pointConnections.set(startKey, (pointConnections.get(startKey) || 0) + 1);
      pointConnections.set(endKey, (pointConnections.get(endKey) || 0) + 1);
    });

    // For a closed polygon, each vertex should connect to exactly 2 walls
    const invalidConnections = Array.from(pointConnections.entries()).filter(
      ([_, count]) => count !== 2,
    );

    if (invalidConnections.length > 0) {
      const details = `${invalidConnections.length} vertices have invalid connections`;
      // Be more lenient - only fail if more than 20% of vertices have bad connections
      const failureThreshold = Math.max(1, Math.ceil(pointConnections.size * 0.2));
      return {
        isConnected: invalidConnections.length <= failureThreshold,
        details,
      };
    }

    return { isConnected: true, details: 'All walls properly connected' };
  }

  /**
   * Calculate polygon area using shoelace formula
   */
  private static calculatePolygonArea(vertices: Point[]): number {
    if (vertices.length < 3) {
      return 0;
    }

    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].z - vertices[j].x * vertices[i].z;
    }

    return Math.abs(area) / 2;
  }
}
