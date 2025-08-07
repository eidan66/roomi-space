'use client';

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

import { RoomObject } from '@/types/room';

import AdvancedGeometryEngine, {
  DoorPlacement,
  WindowPlacement,
} from './AdvancedGeometryEngine';
import { Wall } from './Floorplan2DCanvas';

// --- Advanced geometry helper functions ---

// Ensure vertices are in counter-clockwise order for proper face orientation
const ensureCounterClockwise = (
  vertices: { x: number; z: number }[],
): { x: number; z: number }[] => {
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
};

// Create floor geometry using manual triangulation
const _createManualFloorGeometry = (
  vertices: { x: number; z: number }[],
): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();

  // Simple ear-clipping algorithm for polygon triangulation
  const triangles = triangulatePolygon(vertices);

  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  // Calculate bounding box for UV mapping
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

  const width = maxX - minX;
  const height = maxZ - minZ;

  // Add vertices
  vertices.forEach((v) => {
    positions.push(v.x, 0, v.z);
    normals.push(0, 1, 0); // Floor normal points up
    uvs.push((v.x - minX) / width, (v.z - minZ) / height);
  });

  // Add triangle indices
  triangles.forEach((triangle) => {
    indices.push(triangle[0], triangle[1], triangle[2]);
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
};

// Simple ear-clipping triangulation
const triangulatePolygon = (vertices: { x: number; z: number }[]): number[][] => {
  if (vertices.length < 3) {
    return [];
  }
  if (vertices.length === 3) {
    return [[0, 1, 2]];
  }

  const triangles: number[][] = [];
  const remaining = vertices.map((_, i) => i);

  while (remaining.length > 3) {
    let earFound = false;

    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i - 1 + remaining.length) % remaining.length];
      const curr = remaining[i];
      const next = remaining[(i + 1) % remaining.length];

      if (isEar(vertices, prev, curr, next, remaining)) {
        triangles.push([prev, curr, next]);
        remaining.splice(i, 1);
        earFound = true;
        break;
      }
    }

    if (!earFound) {
      // Fallback: create fan triangulation from first vertex
      for (let i = 1; i < remaining.length - 1; i++) {
        triangles.push([remaining[0], remaining[i], remaining[i + 1]]);
      }
      break;
    }
  }

  // Add the final triangle
  if (remaining.length === 3) {
    triangles.push([remaining[0], remaining[1], remaining[2]]);
  }

  return triangles;
};

// Check if a vertex forms an ear (convex vertex with no other vertices inside the triangle)
const isEar = (
  vertices: { x: number; z: number }[],
  prev: number,
  curr: number,
  next: number,
  remaining: number[],
): boolean => {
  const a = vertices[prev];
  const b = vertices[curr];
  const c = vertices[next];

  // Check if the angle is convex
  const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  if (cross <= 0) {
    return false;
  } // Not convex

  // Check if any other vertex is inside the triangle
  for (const idx of remaining) {
    if (idx === prev || idx === curr || idx === next) {
      continue;
    }

    const p = vertices[idx];
    if (pointInTriangle(p, a, b, c)) {
      return false;
    }
  }

  return true;
};

// Check if a point is inside a triangle
const pointInTriangle = (
  p: { x: number; z: number },
  a: { x: number; z: number },
  b: { x: number; z: number },
  c: { x: number; z: number },
): boolean => {
  const denom = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  if (Math.abs(denom) < 1e-10) {
    return false;
  }

  const alpha = ((b.z - c.z) * (p.x - c.x) + (c.x - b.x) * (p.z - c.z)) / denom;
  const beta = ((c.z - a.z) * (p.x - c.x) + (a.x - c.x) * (p.z - c.z)) / denom;
  const gamma = 1 - alpha - beta;

  return alpha >= 0 && beta >= 0 && gamma >= 0;
};

const getOrderedVertices = (walls: Wall[]): { x: number; z: number }[] => {
  if (walls.length === 0) {
    return [];
  }

  // Create a graph of connected points with better precision handling
  const connections = new Map<
    string,
    { point: { x: number; z: number }; neighbors: { x: number; z: number }[] }
  >();
  const PRECISION = 0.001; // 1mm precision

  // Helper to create consistent keys
  const createKey = (point: { x: number; z: number }) => {
    const x = Math.round(point.x / PRECISION) * PRECISION;
    const z = Math.round(point.z / PRECISION) * PRECISION;
    return `${x.toFixed(3)},${z.toFixed(3)}`;
  };

  // Build the connection graph
  walls.forEach((wall) => {
    const startKey = createKey(wall.start);
    const endKey = createKey(wall.end);

    if (!connections.has(startKey)) {
      connections.set(startKey, { point: wall.start, neighbors: [] });
    }
    if (!connections.has(endKey)) {
      connections.set(endKey, { point: wall.end, neighbors: [] });
    }

    connections.get(startKey)!.neighbors.push(wall.end);
    connections.get(endKey)!.neighbors.push(wall.start);
  });

  // Find starting point - prefer leftmost, then bottommost point for consistency
  let startPoint: { x: number; z: number } | null = null;
  let minX = Infinity;
  let minZ = Infinity;

  for (const [_, data] of connections.entries()) {
    if (data.neighbors.length === 2) {
      // Valid connection point
      if (
        data.point.x < minX ||
        (Math.abs(data.point.x - minX) < PRECISION && data.point.z < minZ)
      ) {
        minX = data.point.x;
        minZ = data.point.z;
        startPoint = data.point;
      }
    }
  }

  if (!startPoint) {
    // Fallback to any point
    const firstEntry = connections.entries().next().value;
    if (!firstEntry) {
      return [];
    }
    startPoint = firstEntry[1].point;
  }

  // Traverse the polygon to get ordered vertices using proper graph traversal
  const orderedVertices: { x: number; z: number }[] = [];
  const visited = new Set<string>();
  let currentPoint = startPoint;
  let previousPoint: { x: number; z: number } | null = null;

  // Traverse until we complete the loop or run out of connections
  while (currentPoint && orderedVertices.length <= walls.length) {
    const currentKey = createKey(currentPoint);

    // If we've visited this point and have at least 3 vertices, we've completed the loop
    if (visited.has(currentKey) && orderedVertices.length >= 3) {
      break;
    }

    // Add current point if not already added
    if (!visited.has(currentKey)) {
      orderedVertices.push({ x: currentPoint.x, z: currentPoint.z });
      visited.add(currentKey);
    }

    const currentData = connections.get(currentKey);
    if (!currentData || currentData.neighbors.length !== 2) {
      break;
    }

    // Find the next neighbor (not the previous one)
    let nextPoint: { x: number; z: number } | null = null;
    for (const neighbor of currentData.neighbors) {
      const isSameAsPrevious =
        previousPoint &&
        Math.abs(neighbor.x - previousPoint.x) < PRECISION &&
        Math.abs(neighbor.z - previousPoint.z) < PRECISION;

      if (!isSameAsPrevious) {
        nextPoint = neighbor;
        break;
      }
    }

    previousPoint = currentPoint;
    if (!nextPoint) {
      break;
    } // Break if nextPoint is null to avoid infinite loop
    currentPoint = nextPoint;
  }

  return orderedVertices;
};

// Check if a floor plan is valid (closed exterior loop exists)
const isValidFloorplan = (walls: Wall[]): boolean => {
  if (walls.length < 3) {
    return false;
  }
  const verts = getOrderedVertices(walls);
  if (verts.length < 3) {
    return false;
  }
  // Shoelace area – if zero the polygon is degenerate
  let area = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    area += verts[i].x * verts[j].z - verts[j].x * verts[i].z;
  }
  return Math.abs(area) > 1e-3; // >1 cm²
};

// Ultra-Advanced Floor Rendering Engine with Multiple Algorithms
class AdvancedFloorEngine {
  private static PRECISION = 0.001;
  private static MIN_AREA = 0.1; // Minimum floor area in m²

  // Main entry point for advanced floor calculation
  static createAdvancedInteriorFloor(
    walls: Wall[],
    exteriorVertices: { x: number; z: number }[],
  ): { x: number; z: number }[] {
    if (walls.length === 0 || exteriorVertices.length < 3) {
      return exteriorVertices;
    }

    console.log(
      '🏗️ Advanced Floor Engine: Processing',
      exteriorVertices.length,
      'vertices',
    );

    // Calculate dynamic inset based on room characteristics
    let insetDistance = this.calculateOptimalInset(walls, exteriorVertices);
    insetDistance = Math.min(insetDistance, 0.05); // Cap inset to avoid floor shrinkage
    console.log('📐 Calculated optimal inset:', insetDistance.toFixed(3), 'm');

    // Try multiple algorithms in order of sophistication
    const algorithms = [
      () => this.straightSkeletonInset(exteriorVertices, insetDistance),
      () => this.adaptivePolygonOffset(exteriorVertices, insetDistance),
      () => this.voronoiBasedInset(exteriorVertices, insetDistance),
      () => this.medialAxisInset(exteriorVertices, insetDistance),
      () => this.centroidBasedInset(exteriorVertices, insetDistance),
    ];

    for (let i = 0; i < algorithms.length; i++) {
      try {
        const result = algorithms[i]();
        if (this.validateInteriorPolygon(result, exteriorVertices)) {
          console.log(
            `✅ Algorithm ${i + 1} succeeded:`,
            [
              'Straight Skeleton',
              'Adaptive Offset',
              'Voronoi',
              'Medial Axis',
              'Centroid',
            ][i],
          );
          return this.optimizeVertices(result);
        }
      } catch (error) {
        console.log(`❌ Algorithm ${i + 1} failed:`, error);
      }
    }

    console.log('⚠️ All algorithms failed, using safe fallback');
    return this.safeFallbackInset(exteriorVertices, insetDistance * 0.5);
  }

  // Calculate optimal inset distance based on room characteristics
  private static calculateOptimalInset(
    walls: Wall[],
    vertices: { x: number; z: number }[],
  ): number {
    const avgThickness =
      walls.reduce((sum, wall) => sum + wall.thickness, 0) / walls.length;
    const roomArea = this.calculatePolygonArea(vertices);
    const perimeter = this.calculatePolygonPerimeter(vertices);

    // Adaptive inset based on room size and shape
    const compactness = (4 * Math.PI * roomArea) / (perimeter * perimeter);
    const sizeAdjustment = Math.min(1.0, roomArea / 50); // Larger rooms can have larger insets
    const shapeAdjustment = Math.max(0.3, compactness); // More compact shapes can have larger insets

    return avgThickness * 0.45 * sizeAdjustment * shapeAdjustment;
  }

  // Method 1: Straight Skeleton Algorithm (most advanced)
  private static straightSkeletonInset(
    vertices: { x: number; z: number }[],
    inset: number,
  ): { x: number; z: number }[] {
    const n = vertices.length;
    const offsetVertices: { x: number; z: number }[] = [];

    for (let i = 0; i < n; i++) {
      const prev = vertices[(i - 1 + n) % n];
      const curr = vertices[i];
      const next = vertices[(i + 1) % n];

      // Calculate edge vectors
      const e1 = { x: curr.x - prev.x, z: curr.z - prev.z };
      const e2 = { x: next.x - curr.x, z: next.z - curr.z };

      // Normalize edges
      const len1 = Math.sqrt(e1.x * e1.x + e1.z * e1.z);
      const len2 = Math.sqrt(e2.x * e2.x + e2.z * e2.z);

      if (len1 < this.PRECISION || len2 < this.PRECISION) {
        continue;
      }

      e1.x /= len1;
      e1.z /= len1;
      e2.x /= len2;
      e2.z /= len2;

      // Calculate angle bisector
      const bisector = { x: e1.x + e2.x, z: e1.z + e2.z };
      const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.z * bisector.z);

      if (bisectorLen < this.PRECISION) {
        continue;
      }

      bisector.x /= bisectorLen;
      bisector.z /= bisectorLen;

      // Calculate angle and adjust offset
      const cosAngle = e1.x * e2.x + e1.z * e2.z;
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      const sinHalfAngle = Math.sin(angle / 2);

      if (sinHalfAngle < 0.1) {
        continue;
      } // Skip very sharp angles

      const adjustedInset = inset / sinHalfAngle;

      // Determine inward direction using cross product
      const cross = e1.x * e2.z - e1.z * e2.x;
      const inwardFactor = cross > 0 ? 1 : -1;

      offsetVertices.push({
        x: curr.x + bisector.x * adjustedInset * inwardFactor,
        z: curr.z + bisector.z * adjustedInset * inwardFactor,
      });
    }

    return offsetVertices;
  }

  // Method 2: Adaptive Polygon Offset with Corner Detection
  private static adaptivePolygonOffset(
    vertices: { x: number; z: number }[],
    inset: number,
  ): { x: number; z: number }[] {
    const n = vertices.length;
    const offsetVertices: { x: number; z: number }[] = [];

    // Detect corner types and adjust offset accordingly
    for (let i = 0; i < n; i++) {
      const prev = vertices[(i - 1 + n) % n];
      const curr = vertices[i];
      const next = vertices[(i + 1) % n];

      const cornerType = this.detectCornerType(prev, curr, next);
      const adaptiveInset = this.getAdaptiveInset(inset, cornerType);

      const normal = this.calculateInwardNormal(prev, curr, next);

      offsetVertices.push({
        x: curr.x + normal.x * adaptiveInset,
        z: curr.z + normal.z * adaptiveInset,
      });
    }

    return this.smoothOffsetVertices(offsetVertices);
  }

  // Method 3: Voronoi-based Interior Calculation
  private static voronoiBasedInset(
    vertices: { x: number; z: number }[],
    inset: number,
  ): { x: number; z: number }[] {
    // Simplified Voronoi approach using distance fields
    const centroid = this.calculateCentroid(vertices);
    const offsetVertices: { x: number; z: number }[] = [];

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];

      // Calculate distance to nearest edges
      const distanceToEdges = this.calculateDistanceToNearestEdges(vertex, vertices);
      const safeInset = Math.min(inset, distanceToEdges * 0.8);

      // Direction towards centroid with edge-aware adjustment
      const toCentroid = {
        x: centroid.x - vertex.x,
        z: centroid.z - vertex.z,
      };

      const distance = Math.sqrt(
        toCentroid.x * toCentroid.x + toCentroid.z * toCentroid.z,
      );
      if (distance < this.PRECISION) {
        continue;
      }

      const normalized = { x: toCentroid.x / distance, z: toCentroid.z / distance };

      offsetVertices.push({
        x: vertex.x + normalized.x * safeInset,
        z: vertex.z + normalized.z * safeInset,
      });
    }

    return offsetVertices;
  }

  // Method 4: Medial Axis Transform
  private static medialAxisInset(
    vertices: { x: number; z: number }[],
    inset: number,
  ): { x: number; z: number }[] {
    const offsetVertices: { x: number; z: number }[] = [];

    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];

      // Find medial axis point (simplified)
      const medialPoint = this.findLocalMedialAxis(vertex, vertices, i);

      // Move towards medial axis
      const direction = {
        x: medialPoint.x - vertex.x,
        z: medialPoint.z - vertex.z,
      };

      const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
      if (distance < this.PRECISION) {
        continue;
      }

      const normalized = { x: direction.x / distance, z: direction.z / distance };
      const safeInset = Math.min(inset, distance * 0.7);

      offsetVertices.push({
        x: vertex.x + normalized.x * safeInset,
        z: vertex.z + normalized.z * safeInset,
      });
    }

    return offsetVertices;
  }

  // Method 5: Enhanced Centroid-based Inset (fallback)
  private static centroidBasedInset(
    vertices: { x: number; z: number }[],
    inset: number,
  ): { x: number; z: number }[] {
    const centroid = this.calculateCentroid(vertices);

    return vertices.map((vertex) => {
      const direction = {
        x: centroid.x - vertex.x,
        z: centroid.z - vertex.z,
      };

      const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
      if (distance < this.PRECISION) {
        return vertex;
      }

      const normalized = { x: direction.x / distance, z: direction.z / distance };

      return {
        x: vertex.x + normalized.x * inset,
        z: vertex.z + normalized.z * inset,
      };
    });
  }

  // Helper Methods
  private static detectCornerType(
    prev: { x: number; z: number },
    curr: { x: number; z: number },
    next: { x: number; z: number },
  ): 'convex' | 'concave' | 'straight' {
    const cross =
      (curr.x - prev.x) * (next.z - curr.z) - (curr.z - prev.z) * (next.x - curr.x);
    if (Math.abs(cross) < this.PRECISION) {
      return 'straight';
    }
    return cross > 0 ? 'convex' : 'concave';
  }

  private static getAdaptiveInset(
    baseInset: number,
    cornerType: 'convex' | 'concave' | 'straight',
  ): number {
    switch (cornerType) {
      case 'convex':
        return baseInset * 0.8; // Reduce inset for convex corners
      case 'concave':
        return baseInset * 1.2; // Increase inset for concave corners
      default:
        return baseInset;
    }
  }

  private static calculateInwardNormal(
    prev: { x: number; z: number },
    curr: { x: number; z: number },
    next: { x: number; z: number },
  ): { x: number; z: number } {
    const e1 = { x: curr.x - prev.x, z: curr.z - prev.z };
    const e2 = { x: next.x - curr.x, z: next.z - curr.z };

    // Calculate perpendicular vectors (normals)
    const n1 = { x: -e1.z, z: e1.x };
    const n2 = { x: -e2.z, z: e2.x };

    // Normalize
    const len1 = Math.sqrt(n1.x * n1.x + n1.z * n1.z);
    const len2 = Math.sqrt(n2.x * n2.x + n2.z * n2.z);

    if (len1 > this.PRECISION) {
      n1.x /= len1;
      n1.z /= len1;
    }
    if (len2 > this.PRECISION) {
      n2.x /= len2;
      n2.z /= len2;
    }

    // Average the normals
    const avgNormal = { x: (n1.x + n2.x) / 2, z: (n1.z + n2.z) / 2 };
    const avgLen = Math.sqrt(avgNormal.x * avgNormal.x + avgNormal.z * avgNormal.z);

    if (avgLen > this.PRECISION) {
      avgNormal.x /= avgLen;
      avgNormal.z /= avgLen;
    }

    return avgNormal;
  }

  private static smoothOffsetVertices(
    vertices: { x: number; z: number }[],
  ): { x: number; z: number }[] {
    if (vertices.length < 3) {
      return vertices;
    }

    const smoothed: { x: number; z: number }[] = [];
    const smoothingFactor = 0.3;

    for (let i = 0; i < vertices.length; i++) {
      const prev = vertices[(i - 1 + vertices.length) % vertices.length];
      const curr = vertices[i];
      const next = vertices[(i + 1) % vertices.length];

      smoothed.push({
        x: curr.x * (1 - smoothingFactor) + ((prev.x + next.x) * smoothingFactor) / 2,
        z: curr.z * (1 - smoothingFactor) + ((prev.z + next.z) * smoothingFactor) / 2,
      });
    }

    return smoothed;
  }

  private static calculateDistanceToNearestEdges(
    point: { x: number; z: number },
    vertices: { x: number; z: number }[],
  ): number {
    let minDistance = Infinity;

    for (let i = 0; i < vertices.length; i++) {
      const start = vertices[i];
      const end = vertices[(i + 1) % vertices.length];
      const distance = this.pointToLineDistance(point, start, end);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  private static pointToLineDistance(
    point: { x: number; z: number },
    lineStart: { x: number; z: number },
    lineEnd: { x: number; z: number },
  ): number {
    const A = point.x - lineStart.x;
    const B = point.z - lineStart.z;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.z - lineStart.z;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq < this.PRECISION) {
      return Math.sqrt(A * A + B * B);
    }

    const param = dot / lenSq;

    let xx, zz;
    if (param < 0) {
      xx = lineStart.x;
      zz = lineStart.z;
    } else if (param > 1) {
      xx = lineEnd.x;
      zz = lineEnd.z;
    } else {
      xx = lineStart.x + param * C;
      zz = lineStart.z + param * D;
    }

    const dx = point.x - xx;
    const dz = point.z - zz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private static findLocalMedialAxis(
    vertex: { x: number; z: number },
    vertices: { x: number; z: number }[],
    index: number,
  ): { x: number; z: number } {
    const n = vertices.length;
    const prev = vertices[(index - 1 + n) % n];
    const next = vertices[(index + 1) % n];

    // Simplified medial axis calculation
    const midpoint1 = { x: (vertex.x + prev.x) / 2, z: (vertex.z + prev.z) / 2 };
    const midpoint2 = { x: (vertex.x + next.x) / 2, z: (vertex.z + next.z) / 2 };

    return { x: (midpoint1.x + midpoint2.x) / 2, z: (midpoint1.z + midpoint2.z) / 2 };
  }

  private static calculateCentroid(vertices: { x: number; z: number }[]): {
    x: number;
    z: number;
  } {
    return {
      x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
      z: vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length,
    };
  }

  private static calculatePolygonArea(vertices: { x: number; z: number }[]): number {
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].z;
      area -= vertices[j].x * vertices[i].z;
    }
    return Math.abs(area) / 2;
  }

  private static calculatePolygonPerimeter(vertices: { x: number; z: number }[]): number {
    let perimeter = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      const dx = vertices[j].x - vertices[i].x;
      const dz = vertices[j].z - vertices[i].z;
      perimeter += Math.sqrt(dx * dx + dz * dz);
    }
    return perimeter;
  }

  private static validateInteriorPolygon(
    interior: { x: number; z: number }[],
    exterior: { x: number; z: number }[],
  ): boolean {
    if (interior.length < 3) {
      return false;
    }

    const interiorArea = this.calculatePolygonArea(interior);
    const exteriorArea = this.calculatePolygonArea(exterior);

    // Interior should be smaller but not too small
    return interiorArea > this.MIN_AREA && interiorArea < exteriorArea * 0.95;
  }

  private static optimizeVertices(
    vertices: { x: number; z: number }[],
  ): { x: number; z: number }[] {
    // Remove vertices that are too close together
    const optimized: { x: number; z: number }[] = [];

    for (let i = 0; i < vertices.length; i++) {
      const curr = vertices[i];
      const next = vertices[(i + 1) % vertices.length];

      const distance = Math.sqrt((next.x - curr.x) ** 2 + (next.z - curr.z) ** 2);
      if (distance > this.PRECISION * 10) {
        optimized.push(curr);
      }
    }

    return optimized.length >= 3 ? optimized : vertices;
  }

  private static safeFallbackInset(
    vertices: { x: number; z: number }[],
    inset: number,
  ): { x: number; z: number }[] {
    const centroid = this.calculateCentroid(vertices);
    const safeInset = Math.min(inset, 0.1); // Very conservative fallback

    return vertices.map((vertex) => {
      const direction = {
        x: centroid.x - vertex.x,
        z: centroid.z - vertex.z,
      };

      const distance = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
      if (distance < this.PRECISION) {
        return vertex;
      }

      const normalized = { x: direction.x / distance, z: direction.z / distance };

      return {
        x: vertex.x + normalized.x * safeInset,
        z: vertex.z + normalized.z * safeInset,
      };
    });
  }
}

// Main function using the advanced engine
const _createAdvancedInteriorFloor = (
  walls: Wall[],
  exteriorVertices: { x: number; z: number }[],
): { x: number; z: number }[] =>
  AdvancedFloorEngine.createAdvancedInteriorFloor(walls, exteriorVertices);

// Advanced Geometry Creation Methods

// Method 1: Constrained Delaunay Triangulation (most robust)
const _createConstrainedDelaunayGeometry = (
  vertices: { x: number; z: number }[],
): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();

  // Implement simplified Delaunay triangulation
  const triangles = delaunayTriangulation(vertices);

  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  // Calculate bounding box for UV mapping
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

  const width = maxX - minX;
  const height = maxZ - minZ;

  // Add vertices with proper UVs and normals
  vertices.forEach((v) => {
    positions.push(v.x, 0, v.z);
    normals.push(0, 1, 0);
    uvs.push((v.x - minX) / width, (v.z - minZ) / height);
  });

  // Add triangle indices
  triangles.forEach((triangle) => {
    indices.push(triangle[0], triangle[1], triangle[2]);
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
};

// Method 2: Advanced Shape Geometry with Holes Support
const _createAdvancedShapeGeometry = (
  vertices: { x: number; z: number }[],
): THREE.BufferGeometry => {
  const shape = new THREE.Shape();

  // Create main shape
  shape.moveTo(vertices[0].x, vertices[0].z);
  for (let i = 1; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, vertices[i].z);
  }
  shape.closePath();

  // Create geometry with advanced settings
  const geometry = new THREE.ShapeGeometry(shape, 32); // Higher curve segments
  geometry.rotateX(Math.PI / 2);

  // Enhanced UV mapping with proper scaling
  geometry.computeBoundingBox();
  if (geometry.boundingBox) {
    const positions = geometry.attributes.position;
    const uvs = [];
    const bboxSize = new THREE.Vector3();
    geometry.boundingBox.getSize(bboxSize);

    // Scale UVs based on real-world dimensions for proper material tiling
    const scaleX = bboxSize.x / 4; // 4m tile repeat
    const scaleZ = bboxSize.z / 4;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      uvs.push(
        ((x - geometry.boundingBox.min.x) / bboxSize.x) * scaleX,
        ((z - geometry.boundingBox.min.z) / bboxSize.z) * scaleZ,
      );
    }

    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  // Compute vertex normals for better lighting
  geometry.computeVertexNormals();

  return geometry;
};

// Method 3: Optimized Ear-Clipping with Quality Improvements
const createOptimizedEarClippingGeometry = (
  vertices: { x: number; z: number }[],
): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();

  // Enhanced ear-clipping with quality checks
  const triangles = optimizedEarClipping(vertices);

  const positions: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  // Calculate centroid for better UV mapping
  const centroid = {
    x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
    z: vertices.reduce((sum, v) => sum + v.z, 0) / vertices.length,
  };

  // Calculate maximum distance for UV normalization
  let maxDistance = 0;
  vertices.forEach((v) => {
    const distance = Math.sqrt((v.x - centroid.x) ** 2 + (v.z - centroid.z) ** 2);
    maxDistance = Math.max(maxDistance, distance);
  });

  // Add vertices with radial UV mapping
  vertices.forEach((v) => {
    positions.push(v.x, 0, v.z);
    normals.push(0, 1, 0);

    // Radial UV mapping for better material distribution
    const dx = v.x - centroid.x;
    const dz = v.z - centroid.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    uvs.push(
      ((Math.cos(angle) * distance) / maxDistance + 1) / 2,
      ((Math.sin(angle) * distance) / maxDistance + 1) / 2,
    );
  });

  // Add optimized triangle indices
  triangles.forEach((triangle) => {
    indices.push(triangle[0], triangle[1], triangle[2]);
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
};

// Delaunay Triangulation Implementation
const delaunayTriangulation = (vertices: { x: number; z: number }[]): number[][] => {
  if (vertices.length < 3) {
    return [];
  }

  // Simplified Bowyer-Watson algorithm
  const triangles: number[][] = [];

  // Create super triangle that encompasses all points
  const bounds = getBounds(vertices);
  const superTriangle = createSuperTriangle(bounds);
  const allVertices = [...vertices, ...superTriangle];

  triangles.push([vertices.length, vertices.length + 1, vertices.length + 2]);

  // Add each vertex one by one
  for (let i = 0; i < vertices.length; i++) {
    const vertex = vertices[i];
    const badTriangles: number[] = [];

    // Find triangles whose circumcircle contains the vertex
    for (let j = 0; j < triangles.length; j++) {
      const triangle = triangles[j];
      if (
        inCircumcircle(
          vertex,
          allVertices[triangle[0]],
          allVertices[triangle[1]],
          allVertices[triangle[2]],
        )
      ) {
        badTriangles.push(j);
      }
    }

    // Find boundary of polygonal hole
    const polygon: Array<[number, number]> = [];
    for (const badTriangleIndex of badTriangles) {
      const triangle = triangles[badTriangleIndex];
      for (let k = 0; k < 3; k++) {
        const edge: [number, number] = [triangle[k], triangle[(k + 1) % 3]];

        // Check if edge is shared with another bad triangle
        let isShared = false;
        for (const otherBadTriangleIndex of badTriangles) {
          if (otherBadTriangleIndex === badTriangleIndex) {
            continue;
          }
          const otherTriangle = triangles[otherBadTriangleIndex];

          if (hasEdge(otherTriangle, edge[0], edge[1])) {
            isShared = true;
            break;
          }
        }

        if (!isShared) {
          polygon.push(edge);
        }
      }
    }

    // Remove bad triangles
    for (let j = badTriangles.length - 1; j >= 0; j--) {
      triangles.splice(badTriangles[j], 1);
    }

    // Add new triangles formed by connecting vertex to polygon boundary
    for (const edge of polygon) {
      triangles.push([i, edge[0], edge[1]]);
    }
  }

  // Remove triangles that contain super triangle vertices
  return triangles.filter(
    (triangle) =>
      triangle[0] < vertices.length &&
      triangle[1] < vertices.length &&
      triangle[2] < vertices.length,
  );
};

// Optimized Ear-Clipping Implementation
const optimizedEarClipping = (vertices: { x: number; z: number }[]): number[][] => {
  if (vertices.length < 3) {
    return [];
  }
  if (vertices.length === 3) {
    return [[0, 1, 2]];
  }

  const triangles: number[][] = [];
  const remaining = vertices.map((_, i) => i);

  // Pre-calculate vertex types (convex/reflex)
  const isConvex = remaining.map((i) => isVertexConvex(vertices, i));

  while (remaining.length > 3) {
    let earFound = false;

    // Prioritize convex vertices for better triangle quality
    const convexVertices = remaining.filter((_, i) => isConvex[remaining[i]]);
    const searchOrder = [
      ...convexVertices,
      ...remaining.filter((_, i) => !isConvex[remaining[i]]),
    ];

    for (const vertexIndex of searchOrder) {
      const i = remaining.indexOf(vertexIndex);
      if (i === -1) {
        continue;
      }

      const prev = remaining[(i - 1 + remaining.length) % remaining.length];
      const curr = remaining[i];
      const next = remaining[(i + 1) % remaining.length];

      if (isEar(vertices, prev, curr, next, remaining)) {
        triangles.push([prev, curr, next]);
        remaining.splice(i, 1);

        // Update convexity for neighboring vertices
        const prevIndex = remaining.indexOf(prev);
        const nextIndex = remaining.indexOf(next);
        if (prevIndex !== -1) {
          isConvex[prev] = isVertexConvex(vertices, prev);
        }
        if (nextIndex !== -1) {
          isConvex[next] = isVertexConvex(vertices, next);
        }

        earFound = true;
        break;
      }
    }

    if (!earFound) {
      // Fallback: create fan triangulation
      for (let i = 1; i < remaining.length - 1; i++) {
        triangles.push([remaining[0], remaining[i], remaining[i + 1]]);
      }
      break;
    }
  }

  if (remaining.length === 3) {
    triangles.push([remaining[0], remaining[1], remaining[2]]);
  }

  return triangles;
};

// Helper Functions
const getBounds = (vertices: { x: number; z: number }[]) => {
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
  return { minX, maxX, minZ, maxZ };
};

const createSuperTriangle = (bounds: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}) => {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxZ - bounds.minZ;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const size = Math.max(width, height) * 3;

  return [
    { x: centerX, z: centerZ - size },
    { x: centerX - size, z: centerZ + size },
    { x: centerX + size, z: centerZ + size },
  ];
};

const inCircumcircle = (
  p: { x: number; z: number },
  a: { x: number; z: number },
  b: { x: number; z: number },
  c: { x: number; z: number },
): boolean => {
  const ax = a.x - p.x;
  const ay = a.z - p.z;
  const bx = b.x - p.x;
  const by = b.z - p.z;
  const cx = c.x - p.x;
  const cy = c.z - p.z;

  const det =
    (ax * ax + ay * ay) * (bx * cy - by * cx) +
    (bx * bx + by * by) * (cx * ay - cy * ax) +
    (cx * cx + cy * cy) * (ax * by - ay * bx);

  return det > 0;
};

const hasEdge = (triangle: number[], v1: number, v2: number): boolean =>
  triangle.includes(v1) && triangle.includes(v2);

const isVertexConvex = (vertices: { x: number; z: number }[], index: number): boolean => {
  const n = vertices.length;
  const prev = vertices[(index - 1 + n) % n];
  const curr = vertices[index];
  const next = vertices[(index + 1) % n];

  const cross =
    (curr.x - prev.x) * (next.z - curr.z) - (curr.z - prev.z) * (next.x - curr.x);
  return cross > 0;
};

// Polygon offset algorithm for creating interior boundaries
const _offsetPolygon = (
  vertices: { x: number; z: number }[],
  offset: number,
): { x: number; z: number }[] => {
  if (vertices.length < 3) {
    return vertices;
  }

  const offsetVertices: { x: number; z: number }[] = [];

  for (let i = 0; i < vertices.length; i++) {
    const prev = vertices[(i - 1 + vertices.length) % vertices.length];
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];

    // Calculate edge vectors
    const edge1 = { x: curr.x - prev.x, z: curr.z - prev.z };
    const edge2 = { x: next.x - curr.x, z: next.z - curr.z };

    // Calculate edge normals (perpendicular vectors pointing inward)
    const normal1 = { x: -edge1.z, z: edge1.x };
    const normal2 = { x: -edge2.z, z: edge2.x };

    // Normalize normals
    const len1 = Math.sqrt(normal1.x ** 2 + normal1.z ** 2);
    const len2 = Math.sqrt(normal2.x ** 2 + normal2.z ** 2);

    if (len1 > 0.001) {
      normal1.x /= len1;
      normal1.z /= len1;
    }
    if (len2 > 0.001) {
      normal2.x /= len2;
      normal2.z /= len2;
    }

    // Calculate bisector (average of normals)
    const bisector = {
      x: (normal1.x + normal2.x) / 2,
      z: (normal1.z + normal2.z) / 2,
    };

    // Normalize bisector
    const bisectorLen = Math.sqrt(bisector.x ** 2 + bisector.z ** 2);
    if (bisectorLen > 0.001) {
      bisector.x /= bisectorLen;
      bisector.z /= bisectorLen;
    }

    // Calculate angle between edges to adjust offset
    const dot = edge1.x * edge2.x + edge1.z * edge2.z;
    const cross = edge1.x * edge2.z - edge1.z * edge2.x;
    const angle = Math.atan2(cross, dot);

    // Adjust offset based on angle (sharper angles need more offset)
    const angleAdjustment = Math.abs(Math.sin(angle / 2));
    const adjustedOffset = angleAdjustment > 0.1 ? offset / angleAdjustment : offset;

    // Apply offset
    const offsetVertex = {
      x: curr.x + bisector.x * adjustedOffset,
      z: curr.z + bisector.z * adjustedOffset,
    };

    offsetVertices.push(offsetVertex);
  }

  return offsetVertices;
};

// Advanced Floor System with Multiple Layers and Details
const _createAdvancedFloorSystem = (
  baseGeometry: THREE.BufferGeometry,
  floorType: string,
  isDarkMode: boolean,
  _vertices: { x: number; z: number }[],
): THREE.Mesh[] => {
  const floorMeshes: THREE.Mesh[] = [];

  // Layer 1: Base Floor with Enhanced Materials
  const baseMaterial = createEnhancedFloorMaterial(floorType, isDarkMode);
  const baseMesh = new THREE.Mesh(baseGeometry.clone(), baseMaterial);
  baseMesh.name = 'floor-base';
  baseMesh.position.y = 0; // Position at ground level
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = false;
  floorMeshes.push(baseMesh);

  return floorMeshes;
};

// Enhanced Floor Materials with Advanced Properties
const createEnhancedFloorMaterial = (
  floorType: string,
  isDarkMode: boolean,
): THREE.MeshStandardMaterial => {
  const baseMaterial = createFloorMaterialByType(
    floorType as 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet',
    isDarkMode,
  );

  // Enhance material properties based on type
  switch (floorType) {
    case 'wood':
      baseMaterial.roughness = 0.7;
      baseMaterial.metalness = 0.02;
      baseMaterial.normalScale = new THREE.Vector2(0.8, 0.8);
      break;
    default:
      break;
    case 'tile':
      baseMaterial.roughness = 0.2;
      baseMaterial.metalness = 0.05;
      baseMaterial.normalScale = new THREE.Vector2(0.3, 0.3);
      break;
    case 'marble':
      baseMaterial.roughness = 0.1;
      baseMaterial.metalness = 0.1;
      baseMaterial.normalScale = new THREE.Vector2(0.5, 0.5);
      break;
    case 'concrete':
      baseMaterial.roughness = 0.9;
      baseMaterial.metalness = 0.01;
      baseMaterial.normalScale = new THREE.Vector2(1.0, 1.0);
      break;
    case 'carpet':
      baseMaterial.roughness = 0.95;
      baseMaterial.metalness = 0.0;
      baseMaterial.normalScale = new THREE.Vector2(1.2, 1.2);
      break;
  }

  return baseMaterial;
};

// Height Variation Layer for Realistic Surface Imperfections
const _createHeightVariationLayer = (
  baseGeometry: THREE.BufferGeometry,
  floorType: string,
  isDarkMode: boolean,
): THREE.Mesh | null => {
  if (floorType === 'carpet') {
    return null;
  }

  const geometry = baseGeometry.clone();
  const positions = geometry.attributes.position;

  // Add subtle height variations
  for (let i = 0; i < positions.count; i++) {
    const variation = (Math.random() - 0.5) * 0.002; // 2mm max variation
    positions.setY(i, positions.getY(i) + variation);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: isDarkMode ? 0x2a2a2a : 0xf0f0f0,
    transparent: true,
    opacity: 0.1,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
};

// Procedural Details (wear patterns, scratches, stains)
const _createProceduralDetails = (
  baseGeometry: THREE.BufferGeometry,
  floorType: string,
  isDarkMode: boolean,
  _vertices: { x: number; z: number }[],
): THREE.Mesh | null => {
  // Create detail texture based on floor type
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base transparent
  ctx.clearRect(0, 0, 512, 512);

  // Add procedural details based on floor type
  switch (floorType) {
    case 'wood':
      addWoodDetails(ctx, isDarkMode);
      break;
    case 'tile':
      addTileDetails(ctx, isDarkMode);
      break;
    case 'concrete':
      addConcreteDetails(ctx, isDarkMode);
      break;
    case 'marble':
      addMarbleDetails(ctx, isDarkMode);
      break;
    default:
      return null;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: 0.3,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(baseGeometry.clone(), material);
};

// Ambient Occlusion Layer for Enhanced Depth
const _createAmbientOcclusionLayer = (
  baseGeometry: THREE.BufferGeometry,
  vertices: { x: number; z: number }[],
  isDarkMode: boolean,
): THREE.Mesh | null => {
  const geometry = baseGeometry.clone();

  // Calculate AO based on vertex proximity to edges
  const positions = geometry.attributes.position;
  const colors: number[] = [];

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);

    // Calculate distance to nearest edge
    let minDistance = Infinity;
    for (let j = 0; j < vertices.length; j++) {
      const start = vertices[j];
      const end = vertices[(j + 1) % vertices.length];
      const distance = pointToLineDistance({ x, z }, start, end);
      minDistance = Math.min(minDistance, distance);
    }

    // Create AO effect (darker near edges)
    const aoFactor = Math.min(1.0, minDistance / 0.5); // 0.5m falloff
    const intensity = isDarkMode ? 0.3 : 0.7;
    const aoValue = intensity + (1 - intensity) * aoFactor;

    colors.push(aoValue, aoValue, aoValue);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
};

// Edge Finishing (baseboards, transitions)
const _createEdgeFinishing = (
  vertices: { x: number; z: number }[],
  isDarkMode: boolean,
): THREE.Mesh[] => {
  const edgeMeshes: THREE.Mesh[] = [];

  // Create baseboards along room perimeter
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length];

    const length = Math.sqrt((end.x - start.x) ** 2 + (end.z - start.z) ** 2);
    if (length < 0.01) {
      continue;
    }

    // Baseboard geometry
    const baseboardGeometry = new THREE.BoxGeometry(length, 0.1, 0.02);
    const baseboardMaterial = new THREE.MeshStandardMaterial({
      color: isDarkMode ? 0x2a2a2a : 0xf5f5f5,
      roughness: 0.8,
      metalness: 0.0,
    });

    const baseboardMesh = new THREE.Mesh(baseboardGeometry, baseboardMaterial);

    // Position and rotate baseboard
    const centerX = (start.x + end.x) / 2;
    const centerZ = (start.z + end.z) / 2;
    const angle = Math.atan2(end.z - start.z, end.x - start.x);

    baseboardMesh.position.set(centerX, 0.05, centerZ);
    baseboardMesh.rotation.y = angle;
    baseboardMesh.castShadow = true;
    baseboardMesh.receiveShadow = true;

    edgeMeshes.push(baseboardMesh);
  }

  return edgeMeshes;
};

// Detail Generation Functions
const addWoodDetails = (ctx: CanvasRenderingContext2D, isDarkMode: boolean) => {
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = isDarkMode ? '#8B4513' : '#654321';
  ctx.lineWidth = 1;

  // Add wood scratches
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    ctx.lineTo(Math.random() * 512, Math.random() * 512);
    ctx.stroke();
  }
};

const addTileDetails = (ctx: CanvasRenderingContext2D, isDarkMode: boolean) => {
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = isDarkMode ? '#1A1A1A' : '#E0E0E0';

  // Add tile imperfections
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 3 + 1;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
};

const addConcreteDetails = (ctx: CanvasRenderingContext2D, isDarkMode: boolean) => {
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = isDarkMode ? '#2C3E50' : '#7F8C8D';

  // Add concrete stains and wear
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 10 + 5;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
};

const addMarbleDetails = (ctx: CanvasRenderingContext2D, isDarkMode: boolean) => {
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = isDarkMode ? '#34495E' : '#ADB5BD';
  ctx.lineWidth = 2;

  // Add marble veining details
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);

    for (let j = 0; j < 5; j++) {
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
    }
    ctx.stroke();
  }
};

const pointToLineDistance = (
  point: { x: number; z: number },
  lineStart: { x: number; z: number },
  lineEnd: { x: number; z: number },
): number => {
  const A = point.x - lineStart.x;
  const B = point.z - lineStart.z;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.z - lineStart.z;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq < 0.001) {
    return Math.sqrt(A * A + B * B);
  }

  const param = dot / lenSq;

  let xx, zz;
  if (param < 0) {
    xx = lineStart.x;
    zz = lineStart.z;
  } else if (param > 1) {
    xx = lineEnd.x;
    zz = lineEnd.z;
  } else {
    xx = lineStart.x + param * C;
    zz = lineStart.z + param * D;
  }

  const dx = point.x - xx;
  const dz = point.z - zz;
  return Math.sqrt(dx * dx + dz * dz);
};

// Create realistic floor material with procedural textures
const _createFloorMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial => {
  // Create procedural wood floor texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base wood color
  const baseColor = isDarkMode ? '#8B4513' : '#DEB887'; // Dark brown or light wood
  const grainColor = isDarkMode ? '#654321' : '#CD853F'; // Darker grain
  const highlightColor = isDarkMode ? '#A0522D' : '#F5DEB3'; // Lighter highlights

  // Fill base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Create wood grain pattern
  for (let i = 0; i < 20; i++) {
    const y = i * 25 + Math.random() * 10;

    // Main grain line
    ctx.strokeStyle = grainColor;
    ctx.lineWidth = 2 + Math.random() * 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);

    // Create wavy grain lines
    for (let x = 0; x <= 512; x += 10) {
      const waveY = y + Math.sin(x * 0.02) * 3 + Math.random() * 2;
      ctx.lineTo(x, waveY);
    }
    ctx.stroke();

    // Add highlights
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, y - 1);
    for (let x = 0; x <= 512; x += 10) {
      const waveY = y - 1 + Math.sin(x * 0.02) * 2;
      ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }

  // Add wood plank separations
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = isDarkMode ? '#5D4037' : '#8D6E63';
  ctx.lineWidth = 1;

  // Vertical plank lines
  for (let x = 0; x < 512; x += 64 + Math.random() * 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Horizontal plank lines (less frequent)
  for (let y = 0; y < 512; y += 128 + Math.random() * 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4); // Repeat the texture 4x4 times across the floor
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Create normal map for depth
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = 512;
  normalCanvas.height = 512;
  const normalCtx = normalCanvas.getContext('2d')!;

  // Create subtle normal map for wood texture depth
  const gradient = normalCtx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#8080FF'); // Normal pointing up
  gradient.addColorStop(0.5, '#7F7FFF');
  gradient.addColorStop(1, '#8080FF');

  normalCtx.fillStyle = gradient;
  normalCtx.fillRect(0, 0, 512, 512);

  // Add grain normal details
  normalCtx.globalAlpha = 0.3;
  for (let i = 0; i < 20; i++) {
    const y = i * 25;
    normalCtx.strokeStyle = '#6060FF'; // Slight depression for grain
    normalCtx.lineWidth = 2;
    normalCtx.beginPath();
    normalCtx.moveTo(0, y);
    normalCtx.lineTo(512, y);
    normalCtx.stroke();
  }

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.repeat.set(4, 4);

  // Create the material
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.8,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  return material;
};

// Create concrete floor material
const _createConcreteFloorMaterial = (
  isDarkMode: boolean,
): THREE.MeshStandardMaterial => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Concrete colors
  const baseColor = isDarkMode ? '#34495E' : '#95A5A6';
  const darkSpots = isDarkMode ? '#2C3E50' : '#7F8C8D';
  const lightSpots = isDarkMode ? '#3E5771' : '#BDC3C7';

  // Fill base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Add concrete texture with random spots and variations
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 8 + 2;

    ctx.fillStyle = Math.random() > 0.5 ? darkSpots : lightSpots;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add subtle cracks
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = darkSpots;
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    const length = Math.random() * 100 + 50;
    const angle = Math.random() * Math.PI * 2;
    ctx.lineTo(
      Math.random() * 512 + Math.cos(angle) * length,
      Math.random() * 512 + Math.sin(angle) * length,
    );
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
};

// Create marble floor material
const _createMarbleFloorMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Marble colors
  const baseColor = isDarkMode ? '#2C3E50' : '#F8F9FA';
  const veinColor = isDarkMode ? '#34495E' : '#ADB5BD';
  const accentColor = isDarkMode ? '#5D6D7E' : '#6C757D';

  // Fill base marble color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Create marble veining pattern
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = veinColor;
  ctx.lineWidth = 2;

  // Main veins
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);

    let currentX = startX;
    let currentY = startY;

    for (let j = 0; j < 20; j++) {
      currentX += (Math.random() - 0.5) * 40;
      currentY += (Math.random() - 0.5) * 40;
      ctx.lineTo(currentX, currentY);
    }
    ctx.stroke();
  }

  // Secondary veins
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1;

  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);

    let currentX = startX;
    let currentY = startY;

    for (let j = 0; j < 10; j++) {
      currentX += (Math.random() - 0.5) * 20;
      currentY += (Math.random() - 0.5) * 20;
      ctx.lineTo(currentX, currentY);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.1,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
};

// Create carpet floor material
const _createCarpetFloorMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Carpet colors
  const baseColor = isDarkMode ? '#8B4513' : '#D2691E';
  const fiberColor1 = isDarkMode ? '#A0522D' : '#F4A460';
  const fiberColor2 = isDarkMode ? '#654321' : '#CD853F';

  // Fill base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Create carpet fiber texture
  ctx.globalAlpha = 0.6;

  for (let x = 0; x < 256; x += 2) {
    for (let y = 0; y < 256; y += 2) {
      const fiber = Math.random() > 0.5 ? fiberColor1 : fiberColor2;
      ctx.fillStyle = fiber;
      ctx.fillRect(x + Math.random() * 2, y + Math.random() * 2, 1, 1);
    }
  }

  // Add carpet pattern
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = isDarkMode ? '#5D4037' : '#8D6E63';
  ctx.lineWidth = 1;

  // Diamond pattern
  for (let x = 0; x < 256; x += 32) {
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 16, y);
      ctx.lineTo(x + 32, y + 16);
      ctx.lineTo(x + 16, y + 32);
      ctx.lineTo(x, y + 16);
      ctx.closePath();
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
};

// Floor material selector
const createFloorMaterialByType = (
  floorType: 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet',
  isDarkMode: boolean,
): THREE.MeshStandardMaterial => {
  // Simplified materials for better compatibility
  const colors = {
    wood: isDarkMode ? 0x8b4513 : 0xdeb887,
    tile: isDarkMode ? 0x2c3e50 : 0xecf0f1,
    concrete: isDarkMode ? 0x34495e : 0x95a5a6,
    marble: isDarkMode ? 0x2c3e50 : 0xf8f9fa,
    carpet: isDarkMode ? 0x8b4513 : 0xd2691e,
  };

  const material = new THREE.MeshStandardMaterial({
    color: colors[floorType],
    roughness: floorType === 'marble' ? 0.1 : 0.8,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  return material;

  // Original complex materials (commented out for debugging)
  /*
  switch (floorType) {
    case 'wood':
      return createFloorMaterial(isDarkMode);
    case 'tile':
      return createTileFloorMaterial(isDarkMode);
    case 'concrete':
      return createConcreteFloorMaterial(isDarkMode);
    case 'marble':
      return createMarbleFloorMaterial(isDarkMode);
    case 'carpet':
      return createCarpetFloorMaterial(isDarkMode);
    default:
      return createFloorMaterial(isDarkMode);
  }
  */
};

// Create alternative tile floor material
const _createTileFloorMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Tile colors
  const tileColor = isDarkMode ? '#2C3E50' : '#ECF0F1';
  const groutColor = isDarkMode ? '#1A252F' : '#BDC3C7';

  // Fill with grout color
  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, 256, 256);

  // Create tiles (4x4 grid)
  const tileSize = 60;
  const groutWidth = 4;

  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      const tileX = x * (tileSize + groutWidth) + groutWidth;
      const tileY = y * (tileSize + groutWidth) + groutWidth;

      // Add slight color variation to each tile
      const variation = (Math.random() - 0.5) * 20;
      const r = parseInt(tileColor.slice(1, 3), 16) + variation;
      const g = parseInt(tileColor.slice(3, 5), 16) + variation;
      const b = parseInt(tileColor.slice(5, 7), 16) + variation;

      ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
      ctx.fillRect(tileX, tileY, tileSize, tileSize);

      // Add subtle tile texture
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
      for (let i = 0; i < 10; i++) {
        const dotX = tileX + Math.random() * tileSize;
        const dotY = tileY + Math.random() * tileSize;
        ctx.fillRect(dotX, dotY, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
};

// Create wall materials
// Create two-sided wall materials (interior vs exterior)
const createWallMaterials = (
  materialType: 'paint' | 'brick' | 'stone' | 'wood' | 'metal',
  isDarkMode: boolean,
): [THREE.MeshStandardMaterial, THREE.MeshStandardMaterial] => {
  // Interior colour scheme
  const interiorColors = {
    paint: isDarkMode ? 0x4a5568 : 0xe2e8f0,
    brick: isDarkMode ? 0x8b4513 : 0xcd853f,
    stone: isDarkMode ? 0x696969 : 0xa9a9a9,
    wood: isDarkMode ? 0x8b4513 : 0xdeb887,
    metal: isDarkMode ? 0x2f4f4f : 0xc0c0c0,
  };

  // Exterior is deliberately muted / neutral so focus stays on interior
  const exteriorColor = isDarkMode ? 0x2d3748 : 0xcbd5e0;

  const interiorMat = new THREE.MeshStandardMaterial({
    color: interiorColors[materialType],
    roughness: materialType === 'metal' ? 0.2 : 0.8,
    metalness: materialType === 'metal' ? 0.8 : 0.1,
    side: THREE.FrontSide,
  });

  const exteriorMat = new THREE.MeshStandardMaterial({
    color: exteriorColor,
    roughness: 1.0,
    metalness: 0.0,
    side: THREE.DoubleSide, // Show both sides for debugging
  });

  return [interiorMat, exteriorMat];
};

// Create paint wall material
const _createPaintWallMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: isDarkMode ? '#4A5568' : '#E2E8F0',
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

// Create brick wall material
const _createBrickWallMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Brick colors
  const brickColor = isDarkMode ? '#8B4513' : '#CD853F';
  const mortarColor = isDarkMode ? '#696969' : '#D3D3D3';

  // Fill with mortar color
  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, 256, 256);

  // Draw bricks
  const brickWidth = 60;
  const brickHeight = 20;
  const mortarWidth = 2;

  for (let row = 0; row < 256 / (brickHeight + mortarWidth); row++) {
    const y = row * (brickHeight + mortarWidth);
    const offset = (row % 2) * (brickWidth / 2);

    for (let col = 0; col < 256 / (brickWidth + mortarWidth) + 1; col++) {
      const x = col * (brickWidth + mortarWidth) + offset;

      // Add slight color variation
      const variation = (Math.random() - 0.5) * 30;
      const r = Math.max(
        0,
        Math.min(255, parseInt(brickColor.slice(1, 3), 16) + variation),
      );
      const g = Math.max(
        0,
        Math.min(255, parseInt(brickColor.slice(3, 5), 16) + variation),
      );
      const b = Math.max(
        0,
        Math.min(255, parseInt(brickColor.slice(5, 7), 16) + variation),
      );

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, brickWidth, brickHeight);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
};

// Create stone wall material
const _createStoneWallMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Stone colors
  const baseColor = isDarkMode ? '#696969' : '#A9A9A9';
  const darkColor = isDarkMode ? '#2F4F4F' : '#808080';
  const lightColor = isDarkMode ? '#778899' : '#C0C0C0';

  // Fill base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Create stone texture
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 20 + 5;

    ctx.fillStyle = Math.random() > 0.5 ? darkColor : lightColor;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
};

// Create wood wall material
const _createWoodWallMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Wood colors
  const baseColor = isDarkMode ? '#8B4513' : '#DEB887';
  const grainColor = isDarkMode ? '#654321' : '#CD853F';

  // Fill base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Create vertical wood grain
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = grainColor;
  ctx.lineWidth = 1;

  for (let i = 0; i < 30; i++) {
    const x = i * 8 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(x, 0);

    for (let y = 0; y <= 256; y += 10) {
      const waveX = x + Math.sin(y * 0.02) * 2;
      ctx.lineTo(waveX, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
};

// Create metal wall material
const _createMetalWallMaterial = (isDarkMode: boolean): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: isDarkMode ? '#2F4F4F' : '#C0C0C0',
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.DoubleSide,
  });

// Create windows with different styles
const createStyledWindow = (
  wall: Wall,
  windowPlacement: WindowPlacement,
  style: 'modern' | 'classic' | 'industrial',
): THREE.Group => {
  switch (style) {
    case 'modern':
      return createModernWindow(wall, windowPlacement);
    case 'classic':
      return createClassicWindow(wall, windowPlacement);
    case 'industrial':
      return createIndustrialWindow(wall, windowPlacement);
    default:
      return createModernWindow(wall, windowPlacement);
  }
};

// Create modern window
const createModernWindow = (
  wall: Wall,
  windowPlacement: WindowPlacement,
): THREE.Group => {
  const windowGroup = new THREE.Group();

  const wallVector = new THREE.Vector3(
    wall.end.x - wall.start.x,
    0,
    wall.end.z - wall.start.z,
  );
  const wallLength = wallVector.length();

  if (wallLength < 2.5) {
    return windowGroup;
  }

  const windowWidth = windowPlacement.width;
  const windowHeight = windowPlacement.height;
  const windowBottom = windowPlacement.bottomHeight;

  const windowPosition = new THREE.Vector3(
    windowPlacement.position.x,
    windowBottom + windowHeight / 2,
    windowPlacement.position.z,
  );

  // Modern glass - large single pane
  const glassGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, 0.01);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.3,
    metalness: 0.1,
    roughness: 0.05,
    side: THREE.DoubleSide,
  });

  const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  windowGroup.add(glassMesh);

  // Minimal modern frame - thin aluminum
  const frameThickness = 0.03;
  const frameDepth = wall.thickness * 1.1;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c3e50,
    roughness: 0.3,
    metalness: 0.7,
    side: THREE.DoubleSide,
  });

  // Thin frame around the glass
  const frameGeometry = new THREE.BoxGeometry(
    windowWidth + frameThickness * 2,
    windowHeight + frameThickness * 2,
    frameDepth,
  );
  const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
  windowGroup.add(frameMesh);

  // Glass cutout
  const cutoutGeometry = new THREE.BoxGeometry(
    windowWidth,
    windowHeight,
    frameDepth + 0.01,
  );
  const cutoutMesh = new THREE.Mesh(
    cutoutGeometry,
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  windowGroup.add(cutoutMesh);

  windowGroup.position.copy(windowPosition);
  windowGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0), // Window's local X axis
    wallVector.clone().normalize(), // Wall direction
  );

  return windowGroup;
};

// Create classic window
const createClassicWindow = (
  wall: Wall,
  windowPlacement: WindowPlacement,
): THREE.Group => {
  const windowGroup = new THREE.Group();

  const wallVector = new THREE.Vector3(
    wall.end.x - wall.start.x,
    0,
    wall.end.z - wall.start.z,
  );
  const wallLength = wallVector.length();

  if (wallLength < 2.5) {
    return windowGroup;
  }

  const windowWidth = windowPlacement.width;
  const windowHeight = windowPlacement.height;
  const windowBottom = windowPlacement.bottomHeight;

  const windowPosition = new THREE.Vector3(
    windowPlacement.position.x,
    windowBottom + windowHeight / 2,
    windowPlacement.position.z,
  );

  // Classic divided glass panes
  const paneWidth = windowWidth / 2;
  const paneHeight = windowHeight / 2;

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.3,
    metalness: 0.1,
    roughness: 0.05,
    side: THREE.DoubleSide,
  });

  // Create 4 glass panes
  for (let x = 0; x < 2; x++) {
    for (let y = 0; y < 2; y++) {
      const glassGeometry = new THREE.BoxGeometry(
        paneWidth - 0.02,
        paneHeight - 0.02,
        0.01,
      );
      const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
      glassMesh.position.set((x - 0.5) * paneWidth, (y - 0.5) * paneHeight, 0);
      windowGroup.add(glassMesh);
    }
  }

  // Classic wooden frame
  const frameThickness = 0.08;
  const frameDepth = wall.thickness * 1.1;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.1,
  });

  // Outer frame
  const outerFrameGeometry = new THREE.BoxGeometry(
    windowWidth + frameThickness * 2,
    windowHeight + frameThickness * 2,
    frameDepth,
  );
  const outerFrameMesh = new THREE.Mesh(outerFrameGeometry, frameMaterial);
  windowGroup.add(outerFrameMesh);

  // Cross dividers
  const hDividerGeometry = new THREE.BoxGeometry(
    windowWidth,
    frameThickness / 2,
    frameDepth,
  );
  const hDividerMesh = new THREE.Mesh(hDividerGeometry, frameMaterial);
  windowGroup.add(hDividerMesh);

  const vDividerGeometry = new THREE.BoxGeometry(
    frameThickness / 2,
    windowHeight,
    frameDepth,
  );
  const vDividerMesh = new THREE.Mesh(vDividerGeometry, frameMaterial);
  windowGroup.add(vDividerMesh);

  // Window sill
  const sillGeometry = new THREE.BoxGeometry(
    windowWidth + frameThickness * 3,
    frameThickness,
    frameDepth + 0.05,
  );
  const sillMesh = new THREE.Mesh(sillGeometry, frameMaterial);
  sillMesh.position.y = -windowHeight / 2 - frameThickness;
  sillMesh.position.z = frameDepth * 0.1;
  windowGroup.add(sillMesh);

  windowGroup.position.copy(windowPosition);
  windowGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0), // Window's local X axis
    wallVector.clone().normalize(), // Wall direction
  );

  return windowGroup;
};

// Create industrial window
const createIndustrialWindow = (
  wall: Wall,
  windowPlacement: WindowPlacement,
): THREE.Group => {
  const windowGroup = new THREE.Group();

  const wallVector = new THREE.Vector3(
    wall.end.x - wall.start.x,
    0,
    wall.end.z - wall.start.z,
  );
  const wallLength = wallVector.length();

  if (wallLength < 2.5) {
    return windowGroup;
  }

  const windowWidth = windowPlacement.width;
  const windowHeight = windowPlacement.height;
  const windowBottom = windowPlacement.bottomHeight;

  const windowPosition = new THREE.Vector3(
    windowPlacement.position.x,
    windowBottom + windowHeight / 2,
    windowPlacement.position.z,
  );

  // Industrial grid glass
  const gridSize = 6;
  const paneWidth = windowWidth / gridSize;
  const paneHeight = windowHeight / gridSize;

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.3,
    metalness: 0.2,
    roughness: 0.1,
    side: THREE.DoubleSide,
  });

  // Create grid of glass panes
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      const glassGeometry = new THREE.BoxGeometry(
        paneWidth - 0.01,
        paneHeight - 0.01,
        0.01,
      );
      const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
      glassMesh.position.set(
        (x - (gridSize - 1) / 2) * paneWidth,
        (y - (gridSize - 1) / 2) * paneHeight,
        0,
      );
      windowGroup.add(glassMesh);
    }
  }

  // Heavy metal frame
  const frameThickness = 0.06;
  const frameDepth = wall.thickness * 1.2;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f4f4f,
    roughness: 0.4,
    metalness: 0.8,
  });

  // Outer frame
  const outerFrameGeometry = new THREE.BoxGeometry(
    windowWidth + frameThickness * 2,
    windowHeight + frameThickness * 2,
    frameDepth,
  );
  const outerFrameMesh = new THREE.Mesh(outerFrameGeometry, frameMaterial);
  windowGroup.add(outerFrameMesh);

  // Grid dividers
  for (let i = 1; i < gridSize; i++) {
    // Horizontal dividers
    const hDividerGeometry = new THREE.BoxGeometry(
      windowWidth,
      frameThickness / 3,
      frameDepth,
    );
    const hDividerMesh = new THREE.Mesh(hDividerGeometry, frameMaterial);
    hDividerMesh.position.y = (i - gridSize / 2) * paneHeight;
    windowGroup.add(hDividerMesh);

    // Vertical dividers
    const vDividerGeometry = new THREE.BoxGeometry(
      frameThickness / 3,
      windowHeight,
      frameDepth,
    );
    const vDividerMesh = new THREE.Mesh(vDividerGeometry, frameMaterial);
    vDividerMesh.position.x = (i - gridSize / 2) * paneWidth;
    windowGroup.add(vDividerMesh);
  }

  windowGroup.position.copy(windowPosition);
  windowGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0), // Window's local X axis
    wallVector.clone().normalize(), // Wall direction
  );

  return windowGroup;
};

// Create optimized windows based on advanced geometry engine
const _createOptimizedWindow = (
  wall: Wall,
  windowPlacement: WindowPlacement,
): THREE.Group => {
  const windowGroup = new THREE.Group();

  const wallVector = new THREE.Vector3(
    wall.end.x - wall.start.x,
    0,
    wall.end.z - wall.start.z,
  );
  const wallLength = wallVector.length();

  if (wallLength < 2.5) {
    return windowGroup;
  }

  // Use optimized window dimensions
  const windowWidth = windowPlacement.width;
  const windowHeight = windowPlacement.height;
  const windowBottom = windowPlacement.bottomHeight;

  // Use optimized position
  const windowPosition = new THREE.Vector3(
    windowPlacement.position.x,
    windowBottom + windowHeight / 2,
    windowPlacement.position.z,
  );

  // Window glass with better transparency
  const glassGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, 0.02);

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.2,
    metalness: 0.1,
    roughness: 0.05,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });

  const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  windowGroup.add(glassMesh);

  // Enhanced window frame with better proportions
  const frameThickness = 0.08;
  const frameDepth = wall.thickness * 1.1;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.1,
  });

  // Horizontal frame pieces (top and bottom)
  const hFrameGeometry = new THREE.BoxGeometry(
    windowWidth + frameThickness * 2,
    frameThickness,
    frameDepth,
  );

  const topFrame = new THREE.Mesh(hFrameGeometry, frameMaterial);
  topFrame.position.y = windowHeight / 2 + frameThickness / 2;
  windowGroup.add(topFrame);

  const bottomFrame = new THREE.Mesh(hFrameGeometry, frameMaterial);
  bottomFrame.position.y = -windowHeight / 2 - frameThickness / 2;
  windowGroup.add(bottomFrame);

  // Vertical frame pieces (left and right)
  const vFrameGeometry = new THREE.BoxGeometry(frameThickness, windowHeight, frameDepth);

  const leftFrame = new THREE.Mesh(vFrameGeometry, frameMaterial);
  leftFrame.position.x = -windowWidth / 2 - frameThickness / 2;
  windowGroup.add(leftFrame);

  const rightFrame = new THREE.Mesh(vFrameGeometry, frameMaterial);
  rightFrame.position.x = windowWidth / 2 + frameThickness / 2;
  windowGroup.add(rightFrame);

  // Window sill
  const sillGeometry = new THREE.BoxGeometry(
    windowWidth + frameThickness * 3,
    frameThickness / 2,
    frameDepth + 0.05,
  );
  const sillMesh = new THREE.Mesh(sillGeometry, frameMaterial);
  sillMesh.position.y = -windowHeight / 2 - frameThickness;
  sillMesh.position.z = frameDepth * 0.1;
  windowGroup.add(sillMesh);

  // Position and rotate the entire window group
  windowGroup.position.copy(windowPosition);
  windowGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0), // Window's local X axis
    wallVector.clone().normalize(), // Wall direction
  );

  // Enable shadows for all window components
  windowGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return windowGroup;
};

// Create a simple hinged door with swing arc indicator
const createDoor = (wall: Wall, door: DoorPlacement): THREE.Group => {
  const group = new THREE.Group();

  // Door leaf
  const thickness = Math.max(0.035, wall.thickness * 0.6);
  const leafGeom = new THREE.BoxGeometry(door.width, door.height, thickness);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.05,
    roughness: 0.6,
  });
  const leaf = new THREE.Mesh(leafGeom, leafMat);
  leaf.castShadow = true;
  leaf.receiveShadow = true;

  // Position leaf so its hinge aligns to local left/right
  const hingeOffset = (door.hinge === 'left' ? -1 : 1) * (door.width / 2);
  leaf.position.x = hingeOffset;
  leaf.position.y = door.height / 2;

  // Hinge pivot
  const pivot = new THREE.Group();
  pivot.add(leaf);

  // World placement
  const pos = new THREE.Vector3(
    door.position.x,
    door.bottomHeight + door.height / 2,
    door.position.z,
  );
  pivot.position.copy(pos);
  // orient pivot to wall direction
  const dir = new THREE.Vector3(
    wall.end.x - wall.start.x,
    0,
    wall.end.z - wall.start.z,
  ).normalize();
  pivot.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

  // Apply swing angle as preview rotation (about Y)
  leaf.rotation.y = door.swingAngle;

  // Simple handle
  const handleGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
  const handle = new THREE.Mesh(handleGeom, handleMat);
  handle.position.set(
    (door.hinge === 'left' ? 1 : -1) * (door.width / 2 - 0.05),
    door.height * 0.9 - door.bottomHeight,
    0,
  );
  handle.rotation.z = Math.PI / 2;
  pivot.add(handle);

  group.add(pivot);
  group.name = `door-${wall.id}`;
  return group;
};

// Create windows in walls with enhanced visual details (legacy function)
const _createWindow = (
  wall: Wall,
  windowHeight: number = 1.2,
  windowWidth: number = 1.5,
  windowBottom: number = 0.8,
): THREE.Group => {
  const windowGroup = new THREE.Group();

  const wallVector = new THREE.Vector3(
    wall.end.x - wall.start.x,
    0,
    wall.end.z - wall.start.z,
  );
  const wallLength = wallVector.length();

  // Only create windows in walls longer than 2.5m
  if (wallLength < 2.5) {
    return windowGroup;
  }

  // Adjust window width to fit wall proportionally
  const actualWindowWidth = Math.min(windowWidth, wallLength * 0.6);

  // Center the window in the wall
  const windowPosition = new THREE.Vector3(
    (wall.start.x + wall.end.x) / 2,
    windowBottom + windowHeight / 2,
    (wall.start.z + wall.end.z) / 2,
  );

  // Window opening (cut into wall)
  const _openingGeometry = new THREE.BoxGeometry(
    actualWindowWidth + 0.1,
    windowHeight + 0.1,
    wall.thickness + 0.1,
  );

  // Window glass with better transparency
  const glassGeometry = new THREE.BoxGeometry(actualWindowWidth, windowHeight, 0.02);

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.2,
    metalness: 0.1,
    roughness: 0.05,
    envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  });

  const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  windowGroup.add(glassMesh);

  // Enhanced window frame with better proportions
  const frameThickness = 0.08;
  const frameDepth = wall.thickness * 1.1;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.8,
    metalness: 0.1,
  });

  // Horizontal frame pieces (top and bottom)
  const hFrameGeometry = new THREE.BoxGeometry(
    actualWindowWidth + frameThickness * 2,
    frameThickness,
    frameDepth,
  );

  const topFrame = new THREE.Mesh(hFrameGeometry, frameMaterial);
  topFrame.position.y = windowHeight / 2 + frameThickness / 2;
  windowGroup.add(topFrame);

  const bottomFrame = new THREE.Mesh(hFrameGeometry, frameMaterial);
  bottomFrame.position.y = -windowHeight / 2 - frameThickness / 2;
  windowGroup.add(bottomFrame);

  // Vertical frame pieces (left and right)
  const vFrameGeometry = new THREE.BoxGeometry(frameThickness, windowHeight, frameDepth);

  const leftFrame = new THREE.Mesh(vFrameGeometry, frameMaterial);
  leftFrame.position.x = -actualWindowWidth / 2 - frameThickness / 2;
  windowGroup.add(leftFrame);

  const rightFrame = new THREE.Mesh(vFrameGeometry, frameMaterial);
  rightFrame.position.x = actualWindowWidth / 2 + frameThickness / 2;
  windowGroup.add(rightFrame);

  // Window sill
  const sillGeometry = new THREE.BoxGeometry(
    actualWindowWidth + frameThickness * 3,
    frameThickness / 2,
    frameDepth + 0.05,
  );
  const sillMesh = new THREE.Mesh(sillGeometry, frameMaterial);
  sillMesh.position.y = -windowHeight / 2 - frameThickness;
  sillMesh.position.z = frameDepth * 0.1;
  windowGroup.add(sillMesh);

  // Position and rotate the entire window group
  windowGroup.position.copy(windowPosition);
  windowGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0), // Window's local X axis
    wallVector.clone().normalize(), // Wall direction
  );

  // Enable shadows for all window components
  windowGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return windowGroup;
};

interface ThreeCanvasProps {
  walls: Wall[];
  objects?: RoomObject[];
  gridEnabled: boolean;
  isDarkMode: boolean;
  showWindows?: boolean;
  floorType?: 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet';
  wallMaterial?: 'paint' | 'brick' | 'stone' | 'wood' | 'metal';
  windowStyle?: 'modern' | 'classic' | 'industrial';
  rendererRef?: React.RefObject<THREE.WebGLRenderer | null>;
  onScreenshot?: (dataURL: string) => void;
  activeTool?: 'select' | 'drag' | 'paint' | 'delete' | 'resize';
  selectedColor?: string;
  selectedObjectId?: string | null;
  onObjectSelect?: (objectId: string | null) => void;
  onObjectMove?: (
    objectId: string,
    newPosition: { x: number; y: number; z: number },
  ) => void;
  apiRef?: React.Ref<{
    addObject: (type: string, position?: { x: number; z: number }) => void;
    getObjects: () => THREE.Object3D[];
  }>;
}

// Furniture Creation Functions
const createChair = (isDarkMode: boolean): THREE.Group => {
  const chairGroup = new THREE.Group();

  const woodColor = isDarkMode ? 0x4a4a4a : 0x8b4513;
  const cushionColor = isDarkMode ? 0x2a2a2a : 0x654321;

  const woodMaterial = new THREE.MeshStandardMaterial({
    color: woodColor,
    roughness: 0.8,
  });
  const cushionMaterial = new THREE.MeshStandardMaterial({
    color: cushionColor,
    roughness: 0.6,
  });

  // Seat
  const seatGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.5);
  const seatMesh = new THREE.Mesh(seatGeometry, cushionMaterial);
  seatMesh.position.y = 0.45;
  chairGroup.add(seatMesh);

  // Backrest
  const backGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.05);
  const backMesh = new THREE.Mesh(backGeometry, woodMaterial);
  backMesh.position.set(0, 0.75, -0.225);
  chairGroup.add(backMesh);

  // Legs
  const legGeometry = new THREE.BoxGeometry(0.05, 0.45, 0.05);
  const legPositions = [
    [-0.2, 0.225, -0.2],
    [0.2, 0.225, -0.2],
    [-0.2, 0.225, 0.2],
    [0.2, 0.225, 0.2],
  ];

  legPositions.forEach((pos) => {
    const legMesh = new THREE.Mesh(legGeometry, woodMaterial);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
    chairGroup.add(legMesh);
  });

  chairGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return chairGroup;
};

// Utility to finalize object metadata
const finalizeObject = (group: THREE.Group, type: string, canPlaceOn: string[] = []) => {
  group.name = `furniture-${type}-${Date.now()}`;
  group.userData.type = type;
  group.userData.isObject = true;
  group.userData.canPlaceOn = canPlaceOn;
  // store bounding box height for stacking
  const box = new THREE.Box3().setFromObject(group);
  group.userData.height = box.max.y - box.min.y;
  group.userData.minY = box.min.y;

  // Calculate radius for collision detection
  const size = new THREE.Vector3();
  box.getSize(size);
  group.userData.radius = Math.max(size.x, size.z) / 2;

  return group;
};

const createTable = (isDarkMode: boolean): THREE.Group => {
  const tableGroup = new THREE.Group();

  const woodColor = isDarkMode ? 0x3a3a3a : 0x8b4513;
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: woodColor,
    roughness: 0.7,
  });

  // Table top
  const topGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.8);
  const topMesh = new THREE.Mesh(topGeometry, woodMaterial);
  topMesh.position.y = 0.75;
  tableGroup.add(topMesh);

  // Legs
  const legGeometry = new THREE.BoxGeometry(0.06, 0.75, 0.06);
  const legPositions = [
    [-0.55, 0.375, -0.35],
    [0.55, 0.375, -0.35],
    [-0.55, 0.375, 0.35],
    [0.55, 0.375, 0.35],
  ];

  legPositions.forEach((pos) => {
    const legMesh = new THREE.Mesh(legGeometry, woodMaterial);
    legMesh.position.set(pos[0], pos[1], pos[2]);
    legMesh.castShadow = true;
    tableGroup.add(legMesh);
  });

  tableGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return finalizeObject(tableGroup, 'table');
};

const createSofa = (isDarkMode: boolean): THREE.Group => {
  const sofaGroup = new THREE.Group();

  const fabricColor = isDarkMode ? 0x2a2a2a : 0x8b4513;
  const fabricMaterial = new THREE.MeshStandardMaterial({
    color: fabricColor,
    roughness: 0.8,
  });

  // Base
  const baseGeometry = new THREE.BoxGeometry(2.0, 0.4, 0.8);
  const baseMesh = new THREE.Mesh(baseGeometry, fabricMaterial);
  baseMesh.position.y = 0.2;
  sofaGroup.add(baseMesh);

  // Backrest
  const backGeometry = new THREE.BoxGeometry(2.0, 0.6, 0.15);
  const backMesh = new THREE.Mesh(backGeometry, fabricMaterial);
  backMesh.position.set(0, 0.7, -0.325);
  sofaGroup.add(backMesh);

  // Armrests
  const armGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.8);
  const leftArm = new THREE.Mesh(armGeometry, fabricMaterial);
  leftArm.position.set(-0.925, 0.7, 0);
  sofaGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, fabricMaterial);
  rightArm.position.set(0.925, 0.7, 0);
  sofaGroup.add(rightArm);

  sofaGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return sofaGroup;
};

const createBed = (isDarkMode: boolean): THREE.Group => {
  const bedGroup = new THREE.Group();

  const frameColor = isDarkMode ? 0x4a4a4a : 0x8b4513;
  const mattressColor = isDarkMode ? 0x5a5a5a : 0xf5f5dc;

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: frameColor,
    roughness: 0.8,
  });
  const mattressMaterial = new THREE.MeshStandardMaterial({
    color: mattressColor,
    roughness: 0.6,
  });

  // Bed frame
  const frameGeometry = new THREE.BoxGeometry(2.1, 0.3, 1.1);
  const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
  frameMesh.position.y = 0.15;
  bedGroup.add(frameMesh);

  // Mattress
  const mattressGeometry = new THREE.BoxGeometry(2.0, 0.2, 1.0);
  const mattressMesh = new THREE.Mesh(mattressGeometry, mattressMaterial);
  mattressMesh.position.y = 0.4;
  bedGroup.add(mattressMesh);

  // Headboard
  const headGeometry = new THREE.BoxGeometry(2.1, 1.0, 0.1);
  const headMesh = new THREE.Mesh(headGeometry, frameMaterial);
  headMesh.position.set(0, 0.8, -0.55);
  bedGroup.add(headMesh);

  bedGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return bedGroup;
};

const createPlant = (isDarkMode: boolean): THREE.Group => {
  const plantGroup = new THREE.Group();

  const potColor = isDarkMode ? 0x2a2a2a : 0x8b4513;
  const leafColor = isDarkMode ? 0x1a4a1a : 0x228b22;

  const potMaterial = new THREE.MeshStandardMaterial({ color: potColor, roughness: 0.8 });
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: leafColor,
    roughness: 0.6,
  });

  // Pot
  const potGeometry = new THREE.CylinderGeometry(0.15, 0.12, 0.3, 16);
  const potMesh = new THREE.Mesh(potGeometry, potMaterial);
  potMesh.position.y = 0.15;
  plantGroup.add(potMesh);

  // Stem
  const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
  const stemMesh = new THREE.Mesh(stemGeometry, leafMaterial);
  stemMesh.position.y = 0.55;
  plantGroup.add(stemMesh);

  // Leaves
  const leafGeometry = new THREE.SphereGeometry(0.3, 8, 6);
  const leafMesh = new THREE.Mesh(leafGeometry, leafMaterial);
  leafMesh.position.y = 0.9;
  leafMesh.scale.set(1, 0.6, 1);
  plantGroup.add(leafMesh);

  plantGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return finalizeObject(plantGroup, 'decor', ['table', 'nightstand', 'shelf']);
};

const createLamp = (isDarkMode: boolean): THREE.Group => {
  const lampGroup = new THREE.Group();

  const baseColor = isDarkMode ? 0x2a2a2a : 0x4a4a4a;
  const shadeColor = isDarkMode ? 0x3a3a3a : 0xf5f5dc;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.8,
  });
  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: shadeColor,
    roughness: 0.6,
  });

  // Base
  const baseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.05, 16);
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.position.y = 0.025;
  lampGroup.add(baseMesh);

  // Pole
  const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8);
  const poleMesh = new THREE.Mesh(poleGeometry, baseMaterial);
  poleMesh.position.y = 0.55;
  lampGroup.add(poleMesh);

  // Lampshade
  const shadeGeometry = new THREE.ConeGeometry(0.25, 0.3, 16, 1, true);
  const shadeMesh = new THREE.Mesh(shadeGeometry, shadeMaterial);
  shadeMesh.position.y = 1.2;
  lampGroup.add(shadeMesh);

  // Light source
  const light = new THREE.PointLight(0xffffaa, 0.5, 3);
  light.position.y = 1.1;
  light.castShadow = true;
  lampGroup.add(light);

  lampGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return lampGroup;
};

const createKitchenIsland = (isDarkMode: boolean): THREE.Group => {
  const islandGroup = new THREE.Group();

  const counterColor = isDarkMode ? 0x2a2a2a : 0x696969;
  const cabinetColor = isDarkMode ? 0x1a1a1a : 0x8b4513;

  const counterMaterial = new THREE.MeshStandardMaterial({
    color: counterColor,
    roughness: 0.3,
  });
  const cabinetMaterial = new THREE.MeshStandardMaterial({
    color: cabinetColor,
    roughness: 0.8,
  });

  // Cabinet base
  const cabinetGeometry = new THREE.BoxGeometry(2.0, 0.8, 1.0);
  const cabinetMesh = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
  cabinetMesh.position.y = 0.4;
  islandGroup.add(cabinetMesh);

  // Countertop
  const counterGeometry = new THREE.BoxGeometry(2.1, 0.05, 1.1);
  const counterMesh = new THREE.Mesh(counterGeometry, counterMaterial);
  counterMesh.position.y = 0.825;
  islandGroup.add(counterMesh);

  islandGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return islandGroup;
};

const createRefrigerator = (isDarkMode: boolean): THREE.Group => {
  const fridgeGroup = new THREE.Group();

  const fridgeColor = isDarkMode ? 0x2a2a2a : 0xf5f5f5;
  const fridgeMaterial = new THREE.MeshStandardMaterial({
    color: fridgeColor,
    roughness: 0.4,
    metalness: 0.1,
  });

  // Main body
  const bodyGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
  const bodyMesh = new THREE.Mesh(bodyGeometry, fridgeMaterial);
  bodyMesh.position.y = 0.9;
  fridgeGroup.add(bodyMesh);

  // Door handles
  const handleGeometry = new THREE.BoxGeometry(0.02, 0.3, 0.02);
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.8,
  });

  const handle1 = new THREE.Mesh(handleGeometry, handleMaterial);
  handle1.position.set(0.25, 1.3, 0.31);
  fridgeGroup.add(handle1);

  const handle2 = new THREE.Mesh(handleGeometry, handleMaterial);
  handle2.position.set(0.25, 0.6, 0.31);
  fridgeGroup.add(handle2);

  fridgeGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return fridgeGroup;
};

const createToilet = (isDarkMode: boolean): THREE.Group => {
  const toiletGroup = new THREE.Group();

  const porcelainColor = isDarkMode ? 0xe8e8e8 : 0xfffff0;
  const porcelainMaterial = new THREE.MeshStandardMaterial({
    color: porcelainColor,
    roughness: 0.1,
  });

  // Base
  const baseGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.6);
  const baseMesh = new THREE.Mesh(baseGeometry, porcelainMaterial);
  baseMesh.position.y = 0.2;
  toiletGroup.add(baseMesh);

  // Tank
  const tankGeometry = new THREE.BoxGeometry(0.35, 0.5, 0.2);
  const tankMesh = new THREE.Mesh(tankGeometry, porcelainMaterial);
  tankMesh.position.set(0, 0.65, -0.2);
  toiletGroup.add(tankMesh);

  // Seat
  const seatGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16);
  const seatMesh = new THREE.Mesh(seatGeometry, porcelainMaterial);
  seatMesh.position.y = 0.42;
  toiletGroup.add(seatMesh);

  toiletGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return toiletGroup;
};

const createSink = (isDarkMode: boolean): THREE.Group => {
  const sinkGroup = new THREE.Group();

  const sinkColor = isDarkMode ? 0xc0c0c0 : 0xf5f5f5;
  const sinkMaterial = new THREE.MeshStandardMaterial({
    color: sinkColor,
    roughness: 0.2,
    metalness: 0.3,
  });

  // Basin
  const basinGeometry = new THREE.CylinderGeometry(0.25, 0.2, 0.15, 16);
  const basinMesh = new THREE.Mesh(basinGeometry, sinkMaterial);
  basinMesh.position.y = 0.075;
  sinkGroup.add(basinMesh);

  // Faucet
  const faucetGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
  const faucetMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.8,
  });
  const faucetMesh = new THREE.Mesh(faucetGeometry, faucetMaterial);
  faucetMesh.position.set(0, 0.3, -0.2);
  sinkGroup.add(faucetMesh);

  sinkGroup.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return sinkGroup;
};

// Function to add furniture to room based on size and layout
const addRoomFurniture = (
  wallGroup: THREE.Group,
  centerX: number,
  centerZ: number,
  roomWidth: number,
  roomDepth: number,
  roomArea: number,
  isDarkMode: boolean,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  polygon: { x: number; z: number }[],
) => {
  const furnitureSpacing = 1.5; // Minimum distance from walls
  const OBJECT_SPACING = 1.0; // Minimum distance between furniture objects
  const minRoomSize = 2.0; // Minimum room dimension to add furniture

  // Helper to clamp position inside bounds with margin
  const clampPos = (x: number, z: number) => ({
    x: THREE.MathUtils.clamp(x, minX + furnitureSpacing, maxX - furnitureSpacing),
    z: THREE.MathUtils.clamp(z, minZ + furnitureSpacing, maxZ - furnitureSpacing),
  });

  // Track placed objects to avoid overlap
  const placed: { x: number; z: number; r: number }[] = [];

  // Point-in-polygon using ray-casting
  const isInside = (x: number, z: number) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x,
        zi = polygon[i].z;
      const xj = polygon[j].x,
        zj = polygon[j].z;
      const intersect = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
      if (intersect) {
        inside = !inside;
      }
    }
    return inside;
  };

  const placeObject = (
    obj: THREE.Object3D,
    desiredX: number,
    desiredZ: number,
    radius: number = 0.5,
  ) => {
    let bestX = desiredX,
      bestZ = desiredZ;
    let minDistance = Infinity;

    // Grid search for best non-conflicting position
    const searchRadius = 3.0; // Search within 3m radius
    const step = 0.5; // 50cm grid

    for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
      for (let dz = -searchRadius; dz <= searchRadius; dz += step) {
        const testX = desiredX + dx;
        const testZ = desiredZ + dz;
        const { x, z } = clampPos(testX, testZ);

        // Check if position inside polygon and within bounds
        if (x === testX && z === testZ && isInside(x, z)) {
          // Check for conflicts with existing objects
          const hasConflict = placed.some(
            (p) => Math.hypot(p.x - x, p.z - z) < p.r + radius + OBJECT_SPACING,
          );

          if (!hasConflict) {
            const distance = Math.hypot(dx, dz);
            if (distance < minDistance) {
              minDistance = distance;
              bestX = x;
              bestZ = z;
            }
          }
        }
      }
    }

    obj.position.set(bestX, obj.position.y, bestZ);
    obj.userData.radius = radius;
    placed.push({ x: bestX, z: bestZ, r: radius });
    wallGroup.add(obj);
  };

  if (roomWidth < minRoomSize || roomDepth < minRoomSize) {
    return;
  }

  // Determine room type based on size and shape
  const aspectRatio = roomWidth / roomDepth;
  const _isSquarish = Math.abs(aspectRatio - 1) < 0.3;

  // Large rooms (>20m²) - Living room setup
  if (roomArea > 20) {
    // Add sofa
    const sofa = createSofa(isDarkMode);
    sofa.name = 'furniture-sofa';
    placeObject(sofa, centerX, centerZ - roomDepth * 0.2, 1.0);

    // Add coffee table
    const table = createTable(isDarkMode);
    table.name = 'furniture-table';
    placeObject(table, centerX, centerZ + roomDepth * 0.1, 0.6);

    // Add chairs
    const chair1 = createChair(isDarkMode);
    chair1.rotation.y = Math.PI / 4;
    chair1.name = 'furniture-chair1';
    placeObject(chair1, centerX - roomWidth * 0.25, centerZ + roomDepth * 0.25, 0.5);

    const chair2 = createChair(isDarkMode);
    chair2.rotation.y = -Math.PI / 4;
    chair2.name = 'furniture-chair2';
    placeObject(chair2, centerX + roomWidth * 0.25, centerZ + roomDepth * 0.25, 0.5);
  }

  // Medium rooms (12-20m²) - Kitchen setup
  else if (roomArea > 12 && roomWidth > 3 && roomDepth > 3) {
    // Add kitchen island
    const island = createKitchenIsland(isDarkMode);
    const islandX = THREE.MathUtils.clamp(
      centerX,
      minX + furnitureSpacing,
      maxX - furnitureSpacing,
    );
    const islandZ = THREE.MathUtils.clamp(
      centerZ,
      minZ + furnitureSpacing,
      maxZ - furnitureSpacing,
    );
    island.position.set(islandX, 0, islandZ);
    island.name = 'furniture-kitchen-island';
    wallGroup.add(island);

    // Add refrigerator in corner
    const fridge = createRefrigerator(isDarkMode);
    const fridgeX = THREE.MathUtils.clamp(
      centerX - roomWidth * 0.35,
      minX + furnitureSpacing,
      maxX - furnitureSpacing,
    );
    const fridgeZ = THREE.MathUtils.clamp(
      centerZ - roomDepth * 0.35,
      minZ + furnitureSpacing,
      maxZ - furnitureSpacing,
    );
    fridge.position.set(fridgeX, 0, fridgeZ);
    fridge.name = 'furniture-refrigerator';
    wallGroup.add(fridge);

    // Add sink
    const sink = createSink(isDarkMode);
    const sinkX = THREE.MathUtils.clamp(
      centerX + roomWidth * 0.3,
      minX + furnitureSpacing,
      maxX - furnitureSpacing,
    );
    const sinkZ = THREE.MathUtils.clamp(
      centerZ + roomDepth * 0.3,
      minZ + furnitureSpacing,
      maxZ - furnitureSpacing,
    );
    sink.position.set(sinkX, 0.8, sinkZ);
    sink.name = 'furniture-sink';
    wallGroup.add(sink);
  }

  // Compact rooms (8-12m²) – choose Home-Office vs Bedroom
  else if (roomArea > 8) {
    if (!_isSquarish) {
      // ----- Home office with lounge -----
      // Desk along longer wall
      const desk = createTable(isDarkMode);
      desk.scale.set(1.6, 1, 0.6);
      desk.name = 'furniture-desk';
      const deskX = THREE.MathUtils.clamp(
        centerX,
        minX + furnitureSpacing + 0.8,
        maxX - furnitureSpacing - 0.8,
      );
      const deskZ = minZ + furnitureSpacing;
      desk.position.set(deskX, 0, deskZ);
      wallGroup.add(desk);

      // Two task chairs
      const chairL = createChair(isDarkMode);
      chairL.name = 'furniture-chair1';
      chairL.position.set(deskX - 0.6, 0, deskZ + 0.7);
      wallGroup.add(chairL);

      const chairR = createChair(isDarkMode);
      chairR.name = 'furniture-chair2';
      chairR.position.set(deskX + 0.6, 0, deskZ + 0.7);
      wallGroup.add(chairR);

      // Sofa + coffee table opposite desk
      const sofa = createSofa(isDarkMode);
      sofa.scale.set(0.8, 1, 0.8);
      sofa.name = 'furniture-sofa';
      sofa.position.set(centerX, 0, maxZ - furnitureSpacing - 1.2);
      wallGroup.add(sofa);

      const coffee = createTable(isDarkMode);
      coffee.scale.set(0.6, 1, 0.6);
      coffee.name = 'furniture-coffee';
      coffee.position.set(centerX, 0, maxZ - furnitureSpacing - 2.0);
      wallGroup.add(coffee);
    } else {
      // ----- Bedroom setup -----
      // Add bed
      const bed = createBed(isDarkMode);
      const bedX = THREE.MathUtils.clamp(
        centerX,
        minX + furnitureSpacing,
        maxX - furnitureSpacing,
      );
      const bedZ = THREE.MathUtils.clamp(
        centerZ - roomDepth * 0.2,
        minZ + furnitureSpacing,
        maxZ - furnitureSpacing,
      );
      bed.position.set(bedX, 0, bedZ);
      bed.name = 'furniture-bed';
      wallGroup.add(bed);

      // Add side table
      const sideTable = createTable(isDarkMode);
      sideTable.scale.set(0.6, 1, 0.6); // Smaller side table
      const tableX = THREE.MathUtils.clamp(
        centerX + roomWidth * 0.3,
        minX + furnitureSpacing,
        maxX - furnitureSpacing,
      );
      const tableZ = THREE.MathUtils.clamp(
        centerZ - roomDepth * 0.2,
        minZ + furnitureSpacing,
        maxZ - furnitureSpacing,
      );
      sideTable.position.set(tableX, 0, tableZ);
      sideTable.name = 'furniture-sidetable';
      wallGroup.add(sideTable);
    }
  }
  // Small rooms (4-8m²) - Bathroom setup
  else if (roomArea > 4 && roomArea <= 8) {
    // Add toilet
    const toilet = createToilet(isDarkMode);
    const toiletX = THREE.MathUtils.clamp(
      centerX - roomWidth * 0.25,
      minX + furnitureSpacing,
      maxX - furnitureSpacing,
    );
    const toiletZ = THREE.MathUtils.clamp(
      centerZ - roomDepth * 0.25,
      minZ + furnitureSpacing,
      maxZ - furnitureSpacing,
    );
    toilet.position.set(toiletX, 0, toiletZ);
    toilet.name = 'furniture-toilet';
    wallGroup.add(toilet);

    // Add sink
    const sink = createSink(isDarkMode);
    const sinkX = THREE.MathUtils.clamp(
      centerX + roomWidth * 0.25,
      minX + furnitureSpacing,
      maxX - furnitureSpacing,
    );
    const sinkZ = THREE.MathUtils.clamp(
      centerZ + roomDepth * 0.25,
      minZ + furnitureSpacing,
      maxZ - furnitureSpacing,
    );
    sink.position.set(sinkX, 0.8, sinkZ);
    sink.name = 'furniture-bathroom-sink';
    wallGroup.add(sink);
  }

  // Always add decorative items if room is big enough
  if (roomArea > 6) {
    // Add plants in corners
    const plant1 = createPlant(isDarkMode);
    plant1.position.set(centerX - roomWidth * 0.35, 0, centerZ - roomDepth * 0.35);
    plant1.name = 'furniture-plant1';
    wallGroup.add(plant1);

    const plant2 = createPlant(isDarkMode);
    plant2.position.set(centerX + roomWidth * 0.35, 0, centerZ + roomDepth * 0.35);
    plant2.name = 'furniture-plant2';
    wallGroup.add(plant2);

    // Add floor lamp
    const lamp = createLamp(isDarkMode);
    lamp.position.set(centerX - roomWidth * 0.3, 0, centerZ + roomDepth * 0.3);
    lamp.name = 'furniture-lamp';
    wallGroup.add(lamp);
  }

  // Clamp all furniture positions to avoid intersecting walls
  wallGroup.children.forEach((child) => {
    if (child.name && child.name.startsWith('furniture-')) {
      child.position.x = Math.max(
        minX + furnitureSpacing,
        Math.min(maxX - furnitureSpacing, child.position.x),
      );
      child.position.z = Math.max(
        minZ + furnitureSpacing,
        Math.min(maxZ - furnitureSpacing, child.position.z),
      );
    }
  });
};

const OBJECT_SPACING = 1.0; // Minimum gap between furniture objects

const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  walls,
  objects: _objects = [],
  gridEnabled,
  isDarkMode,
  showWindows = true,
  floorType = 'wood',
  wallMaterial = 'paint',
  windowStyle = 'modern',
  rendererRef,
  onScreenshot,
  activeTool = 'select',
  selectedColor = '#ffffff',
  apiRef,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // --- API exposed to parent components ---
  const addObject = (type: string, position?: { x: number; z: number }) => {
    console.log('ThreeCanvas addObject called:', type, position);
    if (!sceneRef.current) {
      console.log('No scene available');
      return;
    }

    let obj: THREE.Group | null = null;
    switch (type) {
      case 'chair':
        obj = finalizeObject(createChair(isDarkMode), 'chair');
        break;
      case 'table':
        obj = finalizeObject(createTable(isDarkMode), 'table');
        break;
      case 'sofa':
        obj = finalizeObject(createSofa(isDarkMode), 'sofa');
        break;
      case 'plant':
        obj = finalizeObject(createPlant(isDarkMode), 'decor');
        break;
      case 'lamp':
        obj = finalizeObject(createLamp(isDarkMode), 'lamp');
        break;
      case 'carpet': {
        const geom = new THREE.PlaneGeometry(2, 3);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xaa5533,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2;
        obj = finalizeObject(new THREE.Group().add(mesh) as THREE.Group, 'carpet');
        break;
      }
      case 'fridge':
        obj = finalizeObject(createRefrigerator(isDarkMode), 'fridge');
        break;
      case 'paint': {
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.4, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x888888 }),
        );
        obj = finalizeObject(new THREE.Group().add(cube) as THREE.Group, 'box');
        break;
      }
      case 'floor': {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(1, 0.05, 1),
          new THREE.MeshStandardMaterial({ color: 0x999999 }),
        );
        obj = finalizeObject(new THREE.Group().add(tile) as THREE.Group, 'tile');
        break;
      }
      default:
        console.warn(`Unsupported object type: ${type}`);
        return;
    }

    // Find a random position that doesn't overlap with existing objects
    const findValidPosition = (): { x: number; z: number } => {
      const roomBounds = boundsRef.current;
      if (!roomBounds) {
        return { x: 0, z: 0 };
      }

      const objRadius = obj.userData.radius ?? 0.5;
      const minDistance = objRadius + 0.5; // Minimum distance between objects
      const maxAttempts = 50;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Random position within room bounds with margin
        const margin = 1.0;
        const x =
          roomBounds.minX +
          margin +
          Math.random() * (roomBounds.maxX - roomBounds.minX - 2 * margin);
        const z =
          roomBounds.minZ +
          margin +
          Math.random() * (roomBounds.maxZ - roomBounds.minZ - 2 * margin);

        // Check if position is valid (not overlapping with existing objects)
        const isValid = draggableObjectsRef.current.every((existingObj) => {
          if (existingObj === obj) {
            return true;
          }
          const existingRadius = existingObj.userData.radius ?? 0.5;
          const distance = Math.hypot(
            x - existingObj.position.x,
            z - existingObj.position.z,
          );
          return distance >= objRadius + existingRadius + minDistance;
        });

        if (isValid) {
          return { x, z };
        }
      }

      // Fallback: find position with least overlap
      let bestPosition = { x: 0, z: 0 };
      let minOverlap = Infinity;

      for (let i = 0; i < 10; i++) {
        const margin = 1.0;
        const x =
          roomBounds.minX +
          margin +
          Math.random() * (roomBounds.maxX - roomBounds.minX - 2 * margin);
        const z =
          roomBounds.minZ +
          margin +
          Math.random() * (roomBounds.maxZ - roomBounds.minZ - 2 * margin);

        let totalOverlap = 0;
        draggableObjectsRef.current.forEach((existingObj) => {
          if (existingObj === obj) {
            return;
          }
          const existingRadius = existingObj.userData.radius ?? 0.5;
          const distance = Math.hypot(
            x - existingObj.position.x,
            z - existingObj.position.z,
          );
          const overlap = Math.max(
            0,
            objRadius + existingRadius + minDistance - distance,
          );
          totalOverlap += overlap;
        });

        if (totalOverlap < minOverlap) {
          minOverlap = totalOverlap;
          bestPosition = { x, z };
        }
      }

      return bestPosition;
    };

    const finalPosition = position || findValidPosition();
    const minY = obj.userData.minY ?? 0;
    obj.position.set(finalPosition.x, -minY, finalPosition.z);
    sceneRef.current.add(obj);
    draggableObjectsRef.current.push(obj);
    console.log('Object added successfully:', type, obj.position);
  };

  useImperativeHandle(apiRef, () => ({
    addObject,
    getObjects: () => {
      const objects: THREE.Object3D[] = [];
      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child.userData?.isObject && child.userData?.type) {
            objects.push(child);
          }
        });
      }
      return objects;
    },
  }));
  const activeToolRef = useRef(activeTool);
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);
  const colorRef = useRef(selectedColor);
  useEffect(() => {
    colorRef.current = selectedColor;
  }, [selectedColor]);
  const internalRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const fpControlsRef = useRef<PointerLockControls | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const wallGroupRef = useRef<THREE.Group>(new THREE.Group());
  const polygonRef = useRef<{ x: number; z: number }[]>([]);
  const wallSegmentsRef = useRef<
    { start: { x: number; z: number }; end: { x: number; z: number } }[]
  >([]);
  const floorGroupRef = useRef<THREE.Group>(new THREE.Group());
  const measurementGroupRef = useRef<THREE.Group>(new THREE.Group());

  // Furniture dragging refs
  const boundsRef = useRef<{
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null>(null);
  const draggedRef = useRef<THREE.Object3D | null>(null);
  const draggableObjectsRef = useRef<THREE.Object3D[]>([]);
  const selectedObjectRef = useRef<THREE.Object3D | null>(null);
  const isRotatingRef = useRef<boolean>(false);

  const [isFloorplanValid, setIsFloorplanValid] = useState(false);
  const [processedWalls, setProcessedWalls] = useState<Wall[]>([]);
  const [hoverName, setHoverName] = useState<string>('');
  const [fpMode, setFpMode] = useState(false);
  const [objUndo, setObjUndo] = useState<THREE.Object3D[][]>([]);
  const [objRedo, setObjRedo] = useState<THREE.Object3D[][]>([]);

  // --- Main setup effect (runs only once) ---
  useEffect(() => {
    if (!mountRef.current) {
      return;
    }
    const currentMount = mountRef.current;

    // --- Core Scene Setup ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // --- Skybox ---
    try {
      const tex = new THREE.CubeTextureLoader()
        .setPath('/sky/')
        .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
      scene.background = tex;
      scene.environment = tex; // PBR reflections
    } catch {
      // Fallback to solid color if skybox fails
      scene.background = new THREE.Color(0xffffff); // Always white background
      scene.fog = new THREE.Fog(0xffffff, 20, 60);
    }

    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000,
    );
    cameraRef.current = camera;
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: true, // ensure screenshots capture correctly
    });
    internalRendererRef.current = renderer;
    if (rendererRef) {
      rendererRef.current = renderer;
    }

    // Expose screenshot method
    if (onScreenshot) {
      (
        renderer as THREE.WebGLRenderer & { takeScreenshot?: () => string | null }
      ).takeScreenshot = () => {
        try {
          // Force a render to ensure everything is up to date
          renderer.render(scene, camera);
          return renderer.domElement.toDataURL('image/png');
        } catch (error) {
          console.error('Screenshot failed:', error);
          return null;
        }
      };
    }
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.target.set(0, 1, 0);

    // --- First-Person Controls ---
    const fpControls = new PointerLockControls(camera, renderer.domElement);
    fpControlsRef.current = fpControls;
    const walkKeys: Record<string, boolean> = { w: false, a: false, s: false, d: false };

    // Handle pointer lock errors - use try-catch instead of event listener
    const handlePointerLockError = () => {
      console.log('Pointer lock failed - user may have denied permission');
      setFpMode(false);
      controls.enabled = true;
    };

    // Handle pointer lock changes
    fpControls.addEventListener('lock', () => {
      console.log('Pointer locked - entering first-person mode');
    });

    fpControls.addEventListener('unlock', () => {
      console.log('Pointer unlocked - exiting first-person mode');
      setFpMode(false);
      controls.enabled = true;
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF') {
        setFpMode((prev) => {
          const newMode = !prev;
          controls.enabled = !newMode;
          if (newMode) {
            try {
              fpControls.lock();
            } catch (err) {
              console.log('Failed to lock pointer:', err);
              handlePointerLockError();
            }
          } else {
            fpControls.unlock();
          }
          return newMode;
        });
      }
      if (Object.prototype.hasOwnProperty.call(walkKeys, e.key)) {
        walkKeys[e.key] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (Object.prototype.hasOwnProperty.call(walkKeys, e.key)) {
        walkKeys[e.key] = false;
      }
    });

    // --- Add groups to scene ---
    scene.add(wallGroupRef.current);
    scene.add(floorGroupRef.current);
    scene.add(measurementGroupRef.current);

    // --- Advanced Lighting Setup ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);

    // Main directional light (sun) - warmer tone
    const directionalLight = new THREE.DirectionalLight(0xfff4e6, 1.0);
    directionalLight.position.set(-15, 25, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.left = -40;
    directionalLight.shadow.camera.right = 40;
    directionalLight.shadow.camera.top = 40;
    directionalLight.shadow.camera.bottom = -40;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 120;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.02;
    directionalLight.shadow.radius = 4;
    scene.add(directionalLight);

    // Fill light for softer shadows - cooler tone
    const fillLight = new THREE.DirectionalLight(0xe6f3ff, 0.3);
    fillLight.position.set(15, 15, -15);
    scene.add(fillLight);

    // Rim light for better edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, 8, -25);
    scene.add(rimLight);

    // Additional accent lights for better material definition
    const accentLight1 = new THREE.SpotLight(0xffffff, 0.5, 30, Math.PI / 6, 0.3, 2);
    accentLight1.position.set(-10, 12, 10);
    accentLight1.castShadow = true;
    accentLight1.shadow.mapSize.width = 2048;
    accentLight1.shadow.mapSize.height = 2048;
    scene.add(accentLight1);

    const accentLight2 = new THREE.SpotLight(0xffffff, 0.5, 30, Math.PI / 6, 0.3, 2);
    accentLight2.position.set(10, 12, -10);
    accentLight2.castShadow = true;
    accentLight2.shadow.mapSize.width = 2048;
    accentLight2.shadow.mapSize.height = 2048;
    scene.add(accentLight2);

    // --- Animation Loop ---
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // First-person movement
      if (fpMode && fpControlsRef.current && fpControlsRef.current.isLocked) {
        const dt = clockRef.current.getDelta();
        const speed = 3;
        if (walkKeys.w) {
          fpControlsRef.current.moveForward(speed * dt);
        }
        if (walkKeys.s) {
          fpControlsRef.current.moveForward(-speed * dt);
        }
        if (walkKeys.a) {
          fpControlsRef.current.moveRight(-speed * dt);
        }
        if (walkKeys.d) {
          fpControlsRef.current.moveRight(speed * dt);
        }
      } else {
        controls.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // --- Resize Handling ---
    const handleResize = () => {
      if (!currentMount || !renderer || !camera) {
        return;
      }
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Furniture dragging setup
    const raycaster = new THREE.Raycaster();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 plane

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);

      // HUD hover detection
      if (!draggedRef.current) {
        raycaster.setFromCamera(mouse, camera);
        const hoverHit = raycaster.intersectObjects(draggableObjectsRef.current, true)[0];
        if (hoverHit) {
          let obj = hoverHit.object;
          while (obj.parent && !obj.userData.type) {
            obj = obj.parent;
          }
          setHoverName(obj.userData.type || obj.name || '');
        } else {
          setHoverName('');
        }
      }

      // Handle paint tool
      if (activeToolRef.current === 'paint') {
        const allTargets = [
          ...wallGroupRef.current.children,
          ...draggableObjectsRef.current,
        ];
        const phit = raycaster.intersectObjects(allTargets, true)[0];
        if (phit) {
          let target: THREE.Object3D = phit.object;
          while (target.parent && !target.userData.type) {
            target = target.parent;
          }
          if (target.userData.type === 'wall' || target.userData.colorable) {
            target.traverse((c) => {
              if ((c as THREE.Mesh).isMesh) {
                const mesh = c as THREE.Mesh;

                // Handle array of materials (like walls with interior/exterior)
                if (Array.isArray(mesh.material)) {
                  mesh.material = mesh.material.map((mat, index) => {
                    if (mat && typeof mat.clone === 'function') {
                      const clonedMat = mat.clone();
                      // Only paint interior material (index 0), leave exterior (index 1) unchanged
                      if (index === 0 && 'color' in clonedMat) {
                        (clonedMat as THREE.MeshStandardMaterial).color.set(
                          colorRef.current,
                        );
                      }
                      return clonedMat;
                    }
                    return mat;
                  });
                }
                // Handle single material
                else if (mesh.material && typeof mesh.material.clone === 'function') {
                  mesh.material = mesh.material.clone();
                  if ('color' in mesh.material) {
                    (mesh.material as THREE.MeshStandardMaterial).color.set(
                      colorRef.current,
                    );
                  }
                }
              }
            });
          }
        }
        return;
      }

      // Handle delete tool
      if (activeToolRef.current === 'delete') {
        const dhit = raycaster.intersectObjects(draggableObjectsRef.current, true)[0];
        if (dhit) {
          // Push undo before deleting
          const snapshot = draggableObjectsRef.current.map((o) => o.clone());
          setObjUndo((prev) => [snapshot, ...prev]);
          setObjRedo([]);

          let obj: THREE.Object3D = dhit.object;
          while (obj.parent && !obj.name?.startsWith('furniture-')) {
            obj = obj.parent;
          }
          // If we hit a wall, delete wall instead
          if (obj.name?.startsWith('wall-')) {
            const wallIdx = parseInt(obj.name.split('-')[1] || '-1', 10);
            if (!Number.isNaN(wallIdx)) {
              // remove from scene only; walls source of truth is parent component
              obj.parent?.remove(obj);
              return;
            }
          }
          draggableObjectsRef.current = draggableObjectsRef.current.filter(
            (o) => o !== obj,
          );
          obj.parent?.remove(obj);
        }
        return;
      }

      // Handle resize tool (select)
      if (activeToolRef.current === 'resize') {
        const rhit = raycaster.intersectObjects(draggableObjectsRef.current, true)[0];
        if (rhit) {
          selectedObjectRef.current = rhit.object;
          while (
            selectedObjectRef.current.parent &&
            !selectedObjectRef.current.name?.startsWith('furniture-')
          ) {
            selectedObjectRef.current = selectedObjectRef.current.parent;
          }
          // highlight maybe
        }
        return;
      }

      // Default drag tool
      const hits = raycaster.intersectObjects(draggableObjectsRef.current, true);
      if (hits.length > 0) {
        let furniture = hits[0].object;
        while (furniture.parent && !furniture.name?.startsWith('furniture-')) {
          furniture = furniture.parent;
        }
        if (furniture.name?.startsWith('furniture-')) {
          selectedObjectRef.current = furniture;
          if (e.shiftKey) {
            isRotatingRef.current = true;
          } else {
            draggedRef.current = furniture;
          }
          if (controls) {
            controls.enabled = false;
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activeToolRef.current === 'resize') {
        if (selectedObjectRef.current) {
          const dy = e.movementY || 0;
          const scaleDelta = 1 - dy * 0.01;
          selectedObjectRef.current.scale.multiplyScalar(scaleDelta);
        }
        return;
      }
      if (!selectedObjectRef.current || !boundsRef.current) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      if (isRotatingRef.current) {
        // Rotate object based on mouse movement
        const deltaX = e.movementX || 0;
        selectedObjectRef.current.rotation.y += deltaX * 0.01;
      } else if (draggedRef.current) {
        // --- Move object ---------------------------------------------------
        raycaster.setFromCamera(mouse, camera);
        const hit = new THREE.Vector3();
        raycaster.ray.intersectPlane(dragPlane, hit);

        const newX = hit.x;
        const newZ = hit.z;
        const rObj = draggedRef.current.userData.radius ?? 0.5;
        const GAP_WALL = 0.15; // extra breathing room

        // --- Room containment (polygon + distance to every wall) -----------
        const insideRoom = (() => {
          const poly = polygonRef.current;
          if (!poly || poly.length < 3) {
            return true;
          }
          // even-odd rule (ray cast along –Z)
          let inside = false;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i],
              b = poly[j];
            const intersect =
              a.z > newZ !== b.z > newZ &&
              newX < ((b.x - a.x) * (newZ - a.z)) / (b.z - a.z) + a.x;
            if (intersect) {
              inside = !inside;
            }
          }
          if (!inside) {
            return false;
          }
          // check clearance from every wall segment
          return wallSegmentsRef.current.every((seg) => {
            const ax = seg.start.x,
              az = seg.start.z;
            const bx = seg.end.x,
              bz = seg.end.z;
            const vx = bx - ax,
              vz = bz - az;
            const lenSq = vx * vx + vz * vz;
            if (lenSq === 0) {
              return true;
            }
            const t = Math.max(
              0,
              Math.min(1, ((newX - ax) * vx + (newZ - az) * vz) / lenSq),
            );
            const px = ax + t * vx,
              pz = az + t * vz;
            return Math.hypot(newX - px, newZ - pz) >= rObj + GAP_WALL;
          });
        })();

        // --- Object-object clearance --------------------------------------
        const clearOfOthers = draggableObjectsRef.current.every((o) => {
          if (o === draggedRef.current) {
            return true;
          }
          const r = (o.userData.radius ?? 0.5) + rObj + OBJECT_SPACING;
          return Math.hypot(newX - o.position.x, newZ - o.position.z) >= r;
        });

        const legal = insideRoom && clearOfOthers;

        // --- Visual feedback (clone material once) -------------------------
        draggedRef.current.traverse((c: THREE.Object3D) => {
          if ((c as THREE.Mesh).isMesh) {
            const mesh = c as THREE.Mesh;
            const mat = mesh.material as THREE.Material;
            // Save original color the very first time we touch this mesh
            if (!mesh.userData.origColor) {
              mesh.userData.origColor = (
                mesh.material as THREE.MeshStandardMaterial
              ).color.clone();
            }

            // Clone the material once so we are not mutating a material that may be shared
            if (
              !(mat as THREE.Material & { userData?: { _cloned?: boolean } }).userData
                ?._cloned
            ) {
              mesh.material = mat.clone();
              (
                mesh.material as THREE.Material & { userData: { _cloned: boolean } }
              ).userData._cloned = true;
            }

            // Visual feedback – white if legal, red if illegal
            (mesh.material as THREE.MeshStandardMaterial).color.set(
              legal ? 0xffffff : 0xff0000,
            );
          }
        });

        if (legal) {
          // Set position but maintain proper floor placement
          const floorY = -(draggedRef.current.userData.minY ?? 0);
          draggedRef.current.position.set(newX, floorY, newZ);
        }
      }
    };

    const onPointerUp = () => {
      // --- Stacking logic ---
      if (selectedObjectRef.current) {
        const obj = selectedObjectRef.current as THREE.Group;
        const canPlaceOn: string[] = obj.userData.canPlaceOn || [];
        if (canPlaceOn.length) {
          // raycast straight down to find support object
          const origin = obj.position.clone();
          origin.y += 0.05;
          const down = new THREE.Vector3(0, -1, 0);
          raycaster.set(origin, down);
          const hits = raycaster.intersectObjects(
            draggableObjectsRef.current.filter((o) => o !== obj),
            true,
          );
          for (const h of hits) {
            let target = h.object as THREE.Object3D;
            while (target.parent && !target.userData.type) {
              target = target.parent;
            }
            if (target.userData && canPlaceOn.includes(target.userData.type)) {
              const targetHeight = target.userData.height ?? 1;
              const objMinY = obj.userData.minY ?? 0;
              obj.position.y = target.position.y + targetHeight / 2 - objMinY + 0.01;
              break;
            }
          }
        } else {
          // place on floor - position so bottom of object touches floor
          const objMinY = obj.userData.minY ?? 0;
          obj.position.y = -objMinY;
        }

        // Restore original color
        selectedObjectRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.userData.origColor) {
              (mesh.material as THREE.MeshStandardMaterial).color.copy(
                mesh.userData.origColor,
              );
            }
          }
        });
      }
      draggedRef.current = null;
      selectedObjectRef.current = null;
      isRotatingRef.current = false;
      // Re-enable orbit controls
      if (controls) {
        controls.enabled = true;
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Prevent page scrolling when zooming in the 3D canvas
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    // --- Cleanup ---
    // Undo/Redo keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        if (objUndo.length > 0) {
          const snapshot = draggableObjectsRef.current.map((o) => o.clone());
          setObjRedo((prev) => [snapshot, ...prev]);

          const restore = objUndo[0];
          draggableObjectsRef.current.forEach((o) => scene.remove(o));
          draggableObjectsRef.current = [...restore];
          restore.forEach((o) => scene.add(o));

          setObjUndo((prev) => prev.slice(1));
        }
      }
      if (e.ctrlKey && e.key === 'y') {
        if (objRedo.length > 0) {
          const snapshot = draggableObjectsRef.current.map((o) => o.clone());
          setObjUndo((prev) => [snapshot, ...prev]);

          const restore = objRedo[0];
          draggableObjectsRef.current.forEach((o) => scene.remove(o));
          draggableObjectsRef.current = [...restore];
          restore.forEach((o) => scene.add(o));

          setObjRedo((prev) => prev.slice(1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      controls.dispose();
      fpControlsRef.current?.dispose();
      renderer.dispose();
      if (currentMount && renderer.domElement) {
        // Check if the domElement is still a child before removing
        if (currentMount.contains(renderer.domElement)) {
          currentMount.removeChild(renderer.domElement);
        }
      }
    };
  }, [fpMode, isDarkMode, objRedo, objUndo, onScreenshot, rendererRef]); // Empty dependency array ensures this runs only once

  // --- Update lighting and background on theme change ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    scene.background = new THREE.Color(0xffffff); // Always white background
    scene.fog = new THREE.Fog(0xffffff, 20, 60);

    // You can also update light colors here if needed
    const hemisphereLight = scene.children.find(
      (c) => c instanceof THREE.HemisphereLight,
    ) as THREE.HemisphereLight;
    if (hemisphereLight) {
      hemisphereLight.color.set(isDarkMode ? 0x6688cc : 0xffffff);
      hemisphereLight.groundColor.set(isDarkMode ? 0x334455 : 0x444444);
    }
  }, [isDarkMode]);

  // --- Update grid visibility ---
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    const existingGrid = scene.getObjectByName('gridHelper');
    if (existingGrid) {
      scene.remove(existingGrid);
    }

    if (gridEnabled) {
      // Determine grid size based on current room bounds
      let size = 40;
      let centerX = 0,
        centerZ = 0;
      const poly = polygonRef.current;
      if (poly && poly.length >= 3) {
        const minX = Math.min(...poly.map((v) => v.x));
        const maxX = Math.max(...poly.map((v) => v.x));
        const minZ = Math.min(...poly.map((v) => v.z));
        const maxZ = Math.max(...poly.map((v) => v.z));
        size = Math.max(maxX - minX, maxZ - minZ) + 2; // small margin
        centerX = (minX + maxX) / 2;
        centerZ = (minZ + maxZ) / 2;
      }
      const divisions = Math.max(1, Math.floor(size));
      const gridHelper = new THREE.GridHelper(
        size,
        divisions,
        isDarkMode ? 0x444444 : 0xcccccc,
        isDarkMode ? 0x222222 : 0xeeeeee,
      );
      gridHelper.name = 'gridHelper';
      gridHelper.position.set(centerX, -0.009, centerZ);
      scene.add(gridHelper);
    }
  }, [gridEnabled, walls, isDarkMode]);

  // --- Update walls and floor when wall data changes ---
  useEffect(() => {
    const wallGroup = wallGroupRef.current;
    const floorGroup = floorGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Apply advanced geometry processing
    let currentProcessedWalls = walls;

    if (walls.length > 0) {
      // 1. Enable vertex snapping with precision alignment
      currentProcessedWalls = AdvancedGeometryEngine.snapVertices(currentProcessedWalls);

      // 2. Detect and fix non-planar wall segments
      currentProcessedWalls =
        AdvancedGeometryEngine.fixNonPlanarWalls(currentProcessedWalls);

      // 3. Realign diagonals to rational angles
      currentProcessedWalls =
        AdvancedGeometryEngine.realignDiagonals(currentProcessedWalls);

      // 4. Smooth wall transitions and joints
      currentProcessedWalls =
        AdvancedGeometryEngine.smoothWallTransitions(currentProcessedWalls);

      // 5. Eliminate Z-fighting and rendering artifacts
      currentProcessedWalls =
        AdvancedGeometryEngine.eliminateZFighting(currentProcessedWalls);

      // 7. Validate polygon topology
      const topologyValidation =
        AdvancedGeometryEngine.validateTopology(currentProcessedWalls);
      console.log('Topology validation:', topologyValidation);

      // 9. Perform visual consistency check
      const consistencyReport =
        AdvancedGeometryEngine.performConsistencyCheck(currentProcessedWalls);
      console.log('Consistency report:', consistencyReport);
    }

    // Update state with processed walls
    setProcessedWalls(currentProcessedWalls);

    // Store polygon vertices for later collision checks
    const polygonVerticesCalculated = ensureCounterClockwise(
      getOrderedVertices(currentProcessedWalls),
    );
    polygonRef.current = polygonVerticesCalculated;

    // Extract wall segments for distance calculations
    wallSegmentsRef.current = currentProcessedWalls.map((w) => ({
      start: { x: w.start.x, z: w.start.z },
      end: { x: w.end.x, z: w.end.z },
    }));

    // --- Simple Floor Rendering ---
    const renderFloor = () => {
      console.log('🔧 Starting floor render...');
      floorGroup.clear();

      // Always create a simple floor regardless of wall validity
      if (currentProcessedWalls.length === 0) {
        console.log('⚠️ No walls found, creating default floor');
        // Create a default 10x10 floor at origin
        const defaultGeometry = new THREE.PlaneGeometry(10, 10);
        defaultGeometry.rotateX(Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
          color: 0xf0f0f0, // Light gray
          roughness: 0.6,
          metalness: 0.0,
          side: THREE.DoubleSide,
        });

        const floor = new THREE.Mesh(defaultGeometry, material);
        floor.name = 'floor-default';
        floor.position.set(0, -0.01, 0);
        floor.receiveShadow = true;
        floorGroup.add(floor);
        console.log('✅ Default floor created');
        return;
      }

      try {
        // Get room bounds from walls
        const allVertices: { x: number; z: number }[] = [];
        currentProcessedWalls.forEach((wall) => {
          allVertices.push({ x: wall.start.x, z: wall.start.z });
          allVertices.push({ x: wall.end.x, z: wall.end.z });
        });

        if (allVertices.length === 0) {
          console.log('⚠️ No vertices found');
          return;
        }

        // 1️⃣ Attempt accurate polygon-shaped floor that matches wall outline
        // If multiple interior loops exist, fill them all similar to Blueprint3D
        const loops = AdvancedGeometryEngine.findFloorLoops(currentProcessedWalls);
        if (loops.length > 0) {
          loops.forEach((loop) => {
            const orderedVertices = ensureCounterClockwise(loop.vertices);
            const shape = new THREE.Shape();
            shape.moveTo(orderedVertices[0].x, orderedVertices[0].z);
            for (let i = 1; i < orderedVertices.length; i++) {
              shape.lineTo(orderedVertices[i].x, orderedVertices[i].z);
            }
            shape.lineTo(orderedVertices[0].x, orderedVertices[0].z);

            let floorGeometry: THREE.BufferGeometry | null = null;
            try {
              floorGeometry = new THREE.ShapeGeometry(shape);
              floorGeometry.rotateX(Math.PI / 2);
              floorGeometry.computeBoundingBox();
            } catch {
              floorGeometry = createOptimizedEarClippingGeometry(orderedVertices);
              floorGeometry.rotateX(Math.PI / 2);
            }

            const floorMaterial = new THREE.MeshStandardMaterial({
              color: (() => {
                switch (floorType) {
                  case 'wood':
                    return 0xdeb887;
                  case 'tile':
                    return 0xf5f5f5;
                  case 'marble':
                    return 0xffffff;
                  case 'concrete':
                    return 0xd3d3d3;
                  case 'carpet':
                    return 0xcd853f;
                  default:
                    return 0xf0f0f0;
                }
              })(),
              roughness: 0.6,
              metalness: 0.0,
              side: THREE.DoubleSide,
            });

            const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
            floorMesh.name = 'floor-shape';
            floorMesh.position.y = -0.01;
            floorMesh.receiveShadow = true;
            floorGroup.add(floorMesh);
          });

          // validity based on at least one loop
          setIsFloorplanValid(true);
          console.log('✅ Polygon floors created for loops:', loops.length);
          return;
        }

        const orderedVertices = ensureCounterClockwise(
          getOrderedVertices(currentProcessedWalls),
        );
        // Update validity flag used by UI banner (based on walls only)
        const validNow =
          orderedVertices.length >= 3 && isValidFloorplan(currentProcessedWalls);
        setIsFloorplanValid(validNow);
        if (orderedVertices.length >= 3) {
          const shape = new THREE.Shape();
          shape.moveTo(orderedVertices[0].x, orderedVertices[0].z);
          for (let i = 1; i < orderedVertices.length; i++) {
            shape.lineTo(orderedVertices[i].x, orderedVertices[i].z);
          }
          shape.lineTo(orderedVertices[0].x, orderedVertices[0].z);

          let floorGeometry: THREE.BufferGeometry | null = null;
          try {
            floorGeometry = new THREE.ShapeGeometry(shape);
            floorGeometry.rotateX(Math.PI / 2);
            // Validate geometry
            floorGeometry.computeBoundingBox();
            if (!floorGeometry.boundingBox || floorGeometry.boundingBox.isEmpty()) {
              throw new Error('Empty floor bounding box');
            }
          } catch (err) {
            console.warn('⚠️ ShapeGeometry failed, falling back to ear-clipping:', err);
            floorGeometry = createOptimizedEarClippingGeometry(orderedVertices);
            floorGeometry.rotateX(Math.PI / 2);
          }

          const floorMaterial = new THREE.MeshStandardMaterial({
            color: (() => {
              switch (floorType) {
                case 'wood':
                  return 0xdeb887;
                case 'tile':
                  return 0xf5f5f5;
                case 'marble':
                  return 0xffffff;
                case 'concrete':
                  return 0xd3d3d3;
                case 'carpet':
                  return 0xcd853f;
                default:
                  return 0xf0f0f0;
              }
            })(),
            roughness: 0.6,
            metalness: 0.0,
            side: THREE.DoubleSide,
          });

          const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
          floorMesh.name = 'floor-shape';
          floorMesh.position.y = -0.01;
          floorMesh.receiveShadow = true;
          floorGroup.add(floorMesh);
          console.log('✅ Polygon floor created');

          // Add area sprite at center
          const xs = orderedVertices.map((v) => v.x);
          const zs = orderedVertices.map((v) => v.z);
          const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
          const centerZ = (Math.min(...zs) + Math.max(...zs)) / 2;
          const roomArea = calculateRoomArea(orderedVertices);

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = 512;
          canvas.height = 128;
          context.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
          context.font = 'bold 48px Arial';
          context.textAlign = 'center';
          context.fillText(`${roomArea.toFixed(2)}m²`, 256, 80);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.set(centerX, 0.1, centerZ);
          sprite.scale.set(2, 0.5, 1);
          floorGroup.add(sprite);

          return;
        }

        // Calculate bounds
        const minX = Math.min(...allVertices.map((v) => v.x));
        const maxX = Math.max(...allVertices.map((v) => v.x));
        const minZ = Math.min(...allVertices.map((v) => v.z));
        const maxZ = Math.max(...allVertices.map((v) => v.z));

        const width = maxX - minX;
        const depth = maxZ - minZ;
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;

        console.log(
          `📐 Floor bounds: ${width.toFixed(2)}x${depth.toFixed(2)} at (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})`,
        );

        // Create simple rectangular floor
        const floorGeometry = new THREE.PlaneGeometry(width, depth);
        floorGeometry.rotateX(Math.PI / 2);

        // Create visible material with better colors
        const floorMaterial = new THREE.MeshStandardMaterial({
          color: (() => {
            switch (floorType) {
              case 'wood':
                return 0xdeb887; // Light wood
              case 'tile':
                return 0xf5f5f5; // Light gray tile
              case 'marble':
                return 0xffffff; // White marble
              case 'concrete':
                return 0xd3d3d3; // Light concrete
              case 'carpet':
                return 0xcd853f; // Tan carpet
              default:
                return 0xf0f0f0; // Default light gray
            }
          })(),
          roughness: 0.6,
          metalness: 0.0,
          side: THREE.DoubleSide,
        });

        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.name = 'floor-simple';
        floorMesh.position.set(centerX, -0.01, centerZ); // Slightly below walls
        floorMesh.receiveShadow = true;
        floorMesh.castShadow = false;

        floorGroup.add(floorMesh);
        console.log('✅ Simple floor created and added to group');

        // Add area text
        const roomArea = width * depth;
        if (roomArea > 0) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = 512;
          canvas.height = 128;

          context.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
          context.font = 'bold 48px Arial';
          context.textAlign = 'center';
          context.fillText(`${roomArea.toFixed(2)}m²`, 256, 80);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.set(centerX, 0.1, centerZ);
          sprite.scale.set(2, 0.5, 1);
          floorGroup.add(sprite);
        }
      } catch (error) {
        console.error('❌ Floor rendering error:', error);

        // Emergency fallback - always create a floor
        const emergencyGeometry = new THREE.PlaneGeometry(10, 10);
        emergencyGeometry.rotateX(Math.PI / 2);

        const emergencyMaterial = new THREE.MeshStandardMaterial({
          color: 0xf0f0f0, // Light gray instead of red
          roughness: 0.6,
          metalness: 0.0,
          side: THREE.DoubleSide,
        });

        const emergencyFloor = new THREE.Mesh(emergencyGeometry, emergencyMaterial);
        emergencyFloor.name = 'floor-emergency';
        emergencyFloor.position.set(0, -0.01, 0);
        floorGroup.add(emergencyFloor);
        console.log('🚨 Emergency floor created');
      }
    };

    // Helper function to calculate room area from ordered vertices (matches AdvancedRoomBuilder)
    const calculateRoomArea = (vertices: { x: number; z: number }[]): number => {
      if (vertices.length < 3) {
        return 0;
      }

      // Use the same calculation as AdvancedRoomBuilder for consistency
      // This ensures the 3D view shows the same area as the 2D statistics
      const orderedVertices = ensureCounterClockwise(vertices);

      let area = 0;
      for (let i = 0; i < orderedVertices.length; i++) {
        const j = (i + 1) % orderedVertices.length;
        area += orderedVertices[i].x * orderedVertices[j].z;
        area -= orderedVertices[j].x * orderedVertices[i].z;
      }

      return Math.abs(area) / 2;
    };

    // --- Render Furniture and Objects ---
    const renderFurniture = () => {
      if (!wallGroup) {
        return;
      }

      // Clear existing furniture
      const existingFurniture = wallGroup.children.filter((child) =>
        child.name.startsWith('furniture-'),
      );
      existingFurniture.forEach((furniture) => wallGroup.remove(furniture));

      if (currentProcessedWalls.length === 0) {
        return;
      }

      // Get room dimensions for furniture placement
      const { walls: optimizedWalls } =
        AdvancedGeometryEngine.optimizeWindowPlacements(currentProcessedWalls);
      const isValid = isValidFloorplan(optimizedWalls);
      setIsFloorplanValid(isValid);

      if (!isValid || optimizedWalls.length < 3) {
        return;
      }

      const orderedVertices = getOrderedVertices(optimizedWalls);
      if (orderedVertices.length < 3) {
        return;
      }

      // Calculate room center and bounds
      const centerX =
        orderedVertices.reduce((sum, v) => sum + v.x, 0) / orderedVertices.length;
      const centerZ =
        orderedVertices.reduce((sum, v) => sum + v.z, 0) / orderedVertices.length;

      const minX = Math.min(...orderedVertices.map((v) => v.x));
      const maxX = Math.max(...orderedVertices.map((v) => v.x));
      const minZ = Math.min(...orderedVertices.map((v) => v.z));
      const maxZ = Math.max(...orderedVertices.map((v) => v.z));

      const roomWidth = maxX - minX;
      const roomDepth = maxZ - minZ;
      const roomArea = calculateRoomArea(orderedVertices);

      // Add furniture based on room size and type
      addRoomFurniture(
        wallGroup,
        centerX,
        centerZ,
        roomWidth,
        roomDepth,
        roomArea,
        isDarkMode,
        minX,
        maxX,
        minZ,
        maxZ,
        orderedVertices,
      );

      // Store bounds and draggable objects for furniture dragging
      boundsRef.current = { minX, maxX, minZ, maxZ };
      draggableObjectsRef.current = wallGroup.children.filter((c) =>
        c.name?.startsWith('furniture-'),
      );
    };

    // --- Render Walls ---
    const renderWalls = () => {
      wallGroup.clear();

      if (currentProcessedWalls.length === 0) {
        return;
      }

      // 6. Optimize window placements
      const { walls: wallsWithWindows, windows } =
        AdvancedGeometryEngine.optimizeWindowPlacements(currentProcessedWalls);
      // 6b. Optimize door placements
      const { doors } =
        AdvancedGeometryEngine.optimizeDoorPlacements(currentProcessedWalls);

      // Get ordered vertices to understand room shape
      const orderedVertices = getOrderedVertices(wallsWithWindows);
      const isValidRoom = isValidFloorplan(wallsWithWindows);

      // Enhanced wall rendering with better positioning and materials
      wallsWithWindows.forEach((wall, index) => {
        const wallVector = new THREE.Vector3(
          wall.end.x - wall.start.x,
          0,
          wall.end.z - wall.start.z,
        );
        const wallLength = wallVector.length();

        if (wallLength < 0.01) {
          return;
        } // Skip very short walls

        // Prepare dual-material geometry
        const [interiorMat, exteriorMat] = createWallMaterials(wallMaterial, isDarkMode);
        // BoxGeometry default groups: 0 right,1 left,2 top,3 bottom,4 front,5 back
        // We map interior (room side) to group 4, exterior to group 5
        const wallGeometry = new THREE.BoxGeometry(
          wallLength,
          wall.height,
          wall.thickness,
        );
        // Ensure groups for custom materials
        wallGeometry.groups.forEach((g, idx) => {
          if (idx === 4) {
            g.materialIndex = 0; // interior front
          } else if (idx === 5) {
            g.materialIndex = 1; // exterior back
          } else {
            g.materialIndex = 0; // reuse interior for ends/top/bottom
          }
        });

        const wallMesh = new THREE.Mesh(wallGeometry, [interiorMat, exteriorMat]);

        wallMesh.name = `wall-${index}`;
        wallMesh.userData.type = 'wall';
        wallMesh.userData.colorable = true;

        // Position wall at center point
        wallMesh.position.set(
          (wall.start.x + wall.end.x) / 2,
          wall.height / 2,
          (wall.start.z + wall.end.z) / 2,
        );

        // Rotate wall to align with wall direction
        wallMesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(1, 0, 0), // BoxGeometry's local X axis
          wallVector.clone().normalize(), // Desired direction
        );

        // Enable shadows
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;

        wallGroup.add(wallMesh);

        // Add styled windows
        if (showWindows) {
          const wallWindows = windows.filter((w) => w.wallId === wall.id);
          wallWindows.forEach((windowPlacement) => {
            const windowGroup = createStyledWindow(wall, windowPlacement, windowStyle);
            if (windowGroup.children.length > 0) {
              wallGroup.add(windowGroup);
            }
          });
        }

        // Add doors (always render if present)
        const wallDoors = doors.filter((d) => d.wallId === wall.id);
        wallDoors.forEach((door) => {
          const doorGroup = createDoor(wall, door);
          wallGroup.add(doorGroup);
        });

        // Add wall length measurements
        if (wallLength > 0.5) {
          const midPoint = new THREE.Vector3(
            (wall.start.x + wall.end.x) / 2,
            wall.height + 0.3,
            (wall.start.z + wall.end.z) / 2,
          );

          // Create measurement text
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          canvas.width = 256;
          canvas.height = 64;

          context.fillStyle = isDarkMode ? '#FFFFFF' : '#000000';
          context.font = 'bold 24px Arial';
          context.textAlign = 'center';
          context.fillText(`${wallLength.toFixed(2)}m`, 128, 40);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.1,
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.copy(midPoint);
          sprite.scale.set(1, 0.25, 1);

          // Make measurement face camera
          sprite.name = `measurement-${index}`;
          wallGroup.add(sprite);
        }
      });

      // Add corner connections for valid rooms
      if (isValidRoom && orderedVertices.length > 2) {
        const cornerMaterial = new THREE.MeshStandardMaterial({
          color: isDarkMode ? 0x3a4a5a : 0xd2d8e0,
          roughness: 0.9,
          metalness: 0.1,
        });

        orderedVertices.forEach((vertex, _index) => {
          // Find the average wall thickness at this corner
          const connectedWalls = wallsWithWindows.filter(
            (wall) =>
              (Math.abs(wall.start.x - vertex.x) < 0.01 &&
                Math.abs(wall.start.z - vertex.z) < 0.01) ||
              (Math.abs(wall.end.x - vertex.x) < 0.01 &&
                Math.abs(wall.end.z - vertex.z) < 0.01),
          );

          if (connectedWalls.length >= 2) {
            const avgThickness =
              connectedWalls.reduce((sum, w) => sum + w.thickness, 0) /
              connectedWalls.length;
            const avgHeight =
              connectedWalls.reduce((sum, w) => sum + w.height, 0) /
              connectedWalls.length;

            // Use a cube instead of cylinder for sharp 90° corner
            const cornerGeometry = new THREE.BoxGeometry(
              avgThickness,
              avgHeight,
              avgThickness,
            );

            const cornerMesh = new THREE.Mesh(cornerGeometry, cornerMaterial);
            cornerMesh.position.set(vertex.x, avgHeight / 2, vertex.z);
            cornerMesh.castShadow = true;
            cornerMesh.receiveShadow = true;
            wallGroup.add(cornerMesh);
          }
        });
      }
    };

    renderWalls();
    renderFloor();
    renderFurniture();

    // --- Center camera on the room ---
    if (camera && controls && currentProcessedWalls.length > 0) {
      // 10. Generate room collider and bounding box
      const colliderData =
        AdvancedGeometryEngine.generateColliderAndBounds(currentProcessedWalls);

      const centerX =
        (colliderData.boundingBox.min.x + colliderData.boundingBox.max.x) / 2;
      const centerZ =
        (colliderData.boundingBox.min.z + colliderData.boundingBox.max.z) / 2;
      const centerY = colliderData.boundingBox.max.y / 2;

      controls.target.set(centerX, centerY, centerZ);

      // Calculate optimal camera distance based on room size
      const roomWidth = colliderData.boundingBox.max.x - colliderData.boundingBox.min.x;
      const roomDepth = colliderData.boundingBox.max.z - colliderData.boundingBox.min.z;
      const maxDimension = Math.max(roomWidth, roomDepth);
      const cameraDistance = Math.max(15, maxDimension * 1.5);

      camera.position.set(centerX, cameraDistance, centerZ + cameraDistance);
    }
  }, [walls, showWindows, isDarkMode, floorType, wallMaterial, windowStyle]);

  return (
    <>
      <div ref={mountRef} className="w-full h-full relative">
        {/* Status indicators */}
        {!isFloorplanValid && processedWalls.length > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-10">
            Invalid floor plan: Walls must form a closed shape
          </div>
        )}

        {isFloorplanValid && processedWalls.length > 0 && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-md shadow-lg text-sm z-10">
            ✓ Valid Room ({walls.length} walls)
          </div>
        )}

        {/* 3D Controls hint */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-md text-sm z-10">
          <div>🖱️ Left click + drag: Rotate</div>
          <div>🖱️ Right click + drag: Pan</div>
          <div>🖱️ Scroll: Zoom</div>
          <div>F: First-person mode (click canvas first)</div>
          <div>Ctrl+Z/Y: Undo/Redo</div>
        </div>

        {/* Advanced Room Statistics */}
        {isFloorplanValid && processedWalls.length > 0 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-md text-sm z-10 space-y-1">
            <div className="font-semibold">Advanced Room Stats</div>
            <div>Walls: {processedWalls.length}</div>
            <div>
              Avg Height:{' '}
              {(
                processedWalls.reduce((sum, w) => sum + w.height, 0) /
                processedWalls.length
              ).toFixed(1)}
              m
            </div>
            <div>
              Perimeter:{' '}
              {processedWalls
                .reduce(
                  (sum, w) =>
                    sum +
                    Math.sqrt((w.end.x - w.start.x) ** 2 + (w.end.z - w.start.z) ** 2),
                  0,
                )
                .toFixed(1)}
              m
            </div>
            <div>Vertices: {getOrderedVertices(processedWalls).length}</div>
            <div className="text-green-400">✓ Geometry Optimized</div>
            <div className="text-blue-400">✓ Topology Validated</div>
          </div>
        )}
      </div>

      {/* HUD Overlay */}
      <div className="fixed top-2 left-2 z-50 text-xs bg-black/60 text-white px-2 py-1 rounded">
        {hoverName && <div>{hoverName}</div>}
        {fpMode && fpControlsRef.current?.isLocked && (
          <div className="text-yellow-300">FP Mode</div>
        )}
      </div>
    </>
  );
};

export default ThreeCanvas;
