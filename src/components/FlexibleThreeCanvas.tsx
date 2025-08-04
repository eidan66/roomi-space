import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import {
  Adaptive3DRenderer,
  AdaptiveRenderingOptions,
} from '../lib/adaptive-3d-renderer';

import { Wall } from './Floorplan2DCanvas';

interface FlexibleThreeCanvasProps {
  walls: Wall[];
  floorType: 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet';
  wallMaterial: 'paint' | 'brick' | 'stone' | 'wood' | 'metal';
  windowStyle: 'modern' | 'classic' | 'industrial';
  showWindows: boolean;
  adaptiveOptions?: Partial<AdaptiveRenderingOptions>;
  onRenderingNotes?: (notes: string[]) => void;
}

export const FlexibleThreeCanvas: React.FC<FlexibleThreeCanvasProps> = ({
  walls,
  floorType,
  wallMaterial,
  windowStyle,
  showWindows,
  adaptiveOptions = {},
  onRenderingNotes,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);

  const [renderingQuality, setRenderingQuality] = useState<number>(100);
  const [adaptationInfo, setAdaptationInfo] = useState<string[]>([]);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000,
    );
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) {
        return;
      }

      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update scene when walls change
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) {
      return;
    }

    // Clear existing geometry
    const objectsToRemove = sceneRef.current.children.filter(
      (child) => child.userData.isRoomGeometry,
    );
    objectsToRemove.forEach((obj) => sceneRef.current!.remove(obj));

    if (walls.length === 0) {
      return;
    }

    // Use adaptive renderer to prepare walls for 3D
    const { optimizedWalls, renderingNotes, qualityScore } =
      Adaptive3DRenderer.createRenderingOptimizedWalls(walls, adaptiveOptions);

    setRenderingQuality(qualityScore);
    setAdaptationInfo(renderingNotes);

    if (onRenderingNotes) {
      onRenderingNotes(renderingNotes);
    }

    // Create room geometry with optimized walls
    createRoomGeometry(optimizedWalls);

    // Position camera appropriately
    positionCamera(optimizedWalls);
  }, [
    walls,
    floorType,
    wallMaterial,
    windowStyle,
    showWindows,
    adaptiveOptions,
    createRoomGeometry,
    onRenderingNotes,
  ]);

  const createRoomGeometry = useCallback((optimizedWalls: Wall[]) => {
    if (!sceneRef.current) {
      return;
    }

    const roomGroup = new THREE.Group();
    roomGroup.userData.isRoomGeometry = true;

    // Create floor
    const floorGeometry = createFloorGeometry(optimizedWalls);
    if (floorGeometry) {
      const floorMaterial = createFloorMaterial(floorType);
      const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
      floorMesh.receiveShadow = true;
      roomGroup.add(floorMesh);
    }

    // Create walls
    optimizedWalls.forEach((wall) => {
      const wallMesh = createWallMesh(wall);
      if (wallMesh) {
        roomGroup.add(wallMesh);
      }

      // Add windows if enabled
      if (showWindows) {
        const windowMesh = createWindowMesh(wall);
        if (windowMesh) {
          roomGroup.add(windowMesh);
        }
      }
    });

    sceneRef.current.add(roomGroup);
  }, [floorType, showWindows]);

  const createFloorGeometry = (walls: Wall[]): THREE.BufferGeometry | null => {
    if (walls.length < 3) {
      return null;
    }

    // Extract vertices from walls
    const vertexMap = new Map<string, { x: number; z: number }>();

    walls.forEach((wall) => {
      const startKey = `${wall.start.x.toFixed(3)},${wall.start.z.toFixed(3)}`;
      const endKey = `${wall.end.x.toFixed(3)},${wall.end.z.toFixed(3)}`;

      if (!vertexMap.has(startKey)) {
        vertexMap.set(startKey, wall.start);
      }
      if (!vertexMap.has(endKey)) {
        vertexMap.set(endKey, wall.end);
      }
    });

    // Order vertices to form a polygon (simplified approach)
    const orderedVertices = Array.from(vertexMap.values());

    if (orderedVertices.length < 3) {
      return null;
    }

    // Create geometry using triangulation
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Simple fan triangulation from first vertex
    orderedVertices.forEach((vertex, _index) => {
      positions.push(vertex.x, 0, vertex.z);
      uvs.push(vertex.x / 10, vertex.z / 10); // Simple UV mapping
    });

    // Create triangles
    for (let i = 1; i < orderedVertices.length - 1; i++) {
      indices.push(0, i, i + 1);
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
  };

  const createWallMesh = (wall: Wall): THREE.Mesh | null => {
    const wallVector = new THREE.Vector3(
      wall.end.x - wall.start.x,
      0,
      wall.end.z - wall.start.z,
    );
    const wallLength = wallVector.length();

    if (wallLength < 0.01) {
      return null;
    } // Skip very short walls

    const wallGeometry = new THREE.BoxGeometry(wallLength, wall.height, wall.thickness);
    const wallMaterialMesh = createWallMaterial(wallMaterial);

    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterialMesh);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    // Position and rotate wall
    const centerX = (wall.start.x + wall.end.x) / 2;
    const centerZ = (wall.start.z + wall.end.z) / 2;
    const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);

    wallMesh.position.set(centerX, wall.height / 2, centerZ);
    wallMesh.rotation.y = angle;

    return wallMesh;
  };

  const createWindowMesh = (wall: Wall): THREE.Mesh | null => {
    const wallLength = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.z - wall.start.z, 2),
    );

    // Only add windows to walls longer than 2m
    if (wallLength < 2) {
      return null;
    }

    const windowWidth = Math.min(1.2, wallLength * 0.6);
    const windowHeight = 1.2;
    const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);

    const windowMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.3,
      transmission: 0.9,
      roughness: 0.1,
    });

    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);

    // Position window in center of wall
    const centerX = (wall.start.x + wall.end.x) / 2;
    const centerZ = (wall.start.z + wall.end.z) / 2;
    const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);

    windowMesh.position.set(centerX, wall.height * 0.6, centerZ);
    windowMesh.rotation.y = angle;

    return windowMesh;
  };

  const createFloorMaterial = (type: string): THREE.Material => {
    const material = new THREE.MeshLambertMaterial();

    switch (type) {
      case 'wood':
        material.color.setHex(0xdeb887);
        break;
      case 'tile':
        material.color.setHex(0xf5f5dc);
        break;
      case 'concrete':
        material.color.setHex(0x808080);
        break;
      case 'marble':
        material.color.setHex(0xf8f8ff);
        break;
      case 'carpet':
        material.color.setHex(0x8b4513);
        break;
      default:
        material.color.setHex(0xf5f5dc);
    }

    return material;
  };

  const createWallMaterial = (type: string): THREE.Material => {
    const material = new THREE.MeshLambertMaterial();

    switch (type) {
      case 'paint':
        material.color.setHex(0xffffff);
        break;
      case 'brick':
        material.color.setHex(0xb22222);
        break;
      case 'stone':
        material.color.setHex(0x696969);
        break;
      case 'wood':
        material.color.setHex(0xdeb887);
        break;
      case 'metal':
        material.color.setHex(0xc0c0c0);
        break;
      default:
        material.color.setHex(0xffffff);
    }

    return material;
  };

  const positionCamera = (walls: Wall[]) => {
    if (!cameraRef.current || walls.length === 0) {
      return;
    }

    // Calculate room bounds
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

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const roomWidth = maxX - minX;
    const roomDepth = maxZ - minZ;
    const maxDimension = Math.max(roomWidth, roomDepth);

    // Position camera at a good viewing angle
    const distance = Math.max(10, maxDimension * 1.5);
    cameraRef.current.position.set(
      centerX + distance * 0.7,
      distance * 0.8,
      centerZ + distance * 0.7,
    );

    if (controlsRef.current) {
      controlsRef.current.target.set(centerX, 0, centerZ);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />

      {/* Rendering Quality Indicator */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded text-sm">
        <div className="flex items-center gap-2">
          <span>3D Quality:</span>
          <div
            className={`px-2 py-1 rounded text-xs ${(() => {
              if (renderingQuality >= 90) {
                return 'bg-green-600';
              }
              if (renderingQuality >= 70) {
                return 'bg-yellow-600';
              }
              return 'bg-red-600';
            })()}`}
          >
            {renderingQuality}/100
          </div>
        </div>
      </div>

      {/* Adaptation Info */}
      {adaptationInfo.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded max-w-md text-xs">
          <div className="font-semibold mb-1">3D Adaptations:</div>
          <ul className="space-y-1">
            {adaptationInfo.slice(0, 3).map((info, index) => (
              <li key={index} className="opacity-80">
                • {info}
              </li>
            ))}
            {adaptationInfo.length > 3 && (
              <li className="opacity-60">... and {adaptationInfo.length - 3} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
