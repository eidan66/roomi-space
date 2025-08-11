'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import { useSelector } from 'react-redux';
import * as THREE from 'three';

import { DrawingRoom } from '@/features/roomSlice';
import { RootState } from '@/features/store';
import { AdvancedRoomDrawing } from '@/lib/advanced-room-drawing';
import { EnhancedFloorRenderer } from '@/lib/enhanced-floor-renderer';

interface EnhancedThreeCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  isDarkMode?: boolean;
  floorType?: 'wood' | 'tile' | 'concrete' | 'marble' | 'carpet';
  wallMaterial?: 'paint' | 'brick' | 'stone' | 'wood' | 'metal';
  showWindows?: boolean;
  onScreenshot?: (url: string) => void;
}

export const EnhancedThreeCanvas: React.FC<EnhancedThreeCanvasProps> = ({
  width = 800,
  height = 600,
  className = '',
  isDarkMode = false,
  floorType = 'wood',
  wallMaterial = 'paint',
  showWindows: _showWindows = true,
  onScreenshot,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const wallGroupRef = useRef<THREE.Group | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);

  const { rooms } = useSelector((state: RootState) => state.room);

  // Initialize Three.js scene
  const initializeScene = useCallback(async () => {
    if (!mountRef.current) {
      return;
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x1a1a1a : 0xffffff);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 8, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with white background preference
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0xffffff, 1); // Always white background
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Additional lighting for better visualization
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(hemisphereLight);

    // Groups for organization
    const wallGroup = new THREE.Group();
    wallGroup.name = 'walls';
    scene.add(wallGroup);
    wallGroupRef.current = wallGroup;

    const floorGroup = new THREE.Group();
    floorGroup.name = 'floors';
    scene.add(floorGroup);
    floorGroupRef.current = floorGroup;

    // Controls (assuming OrbitControls)
    try {
      const { OrbitControls } = await import('three-stdlib');
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.maxPolarAngle = Math.PI / 2;
      controlsRef.current = controls;
    } catch (error) {
      console.warn('OrbitControls not available:', error);
    }

    mountRef.current.appendChild(renderer.domElement);

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height, isDarkMode]);

  // Create wall geometry
  const createWallGeometry = useCallback(
    (
      start: { x: number; z: number },
      end: { x: number; z: number },
      height: number,
      thickness: number,
    ): THREE.BoxGeometry => {
      const length = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.z - start.z, 2),
      );
      return new THREE.BoxGeometry(length, height, thickness);
    },
    [],
  );

  // Create wall material
  const createWallMaterial = useCallback((type: string): THREE.Material => {
    const material = new THREE.MeshLambertMaterial();

    switch (type) {
      case 'paint':
        material.color.setHex(0xf5f5f5);
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
        material.color.setHex(0xf5f5f5);
    }

    return material;
  }, []);

  // Create floor material
  const createFloorMaterial = useCallback((type: string): THREE.Material => {
    const material = new THREE.MeshLambertMaterial({
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

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
  }, []);

  // Update walls
  const updateWalls = useCallback(() => {
    if (!wallGroupRef.current || !sceneRef.current) {
      return;
    }

    // Clear existing walls
    wallGroupRef.current.clear();

    const wallMat = createWallMaterial(wallMaterial);

    rooms.forEach((room) => {
      if (!room.isCompleted) {
        return;
      }

      room.walls.forEach((wall) => {
        const geometry = createWallGeometry(
          wall.start,
          wall.end,
          wall.height,
          wall.thickness,
        );
        const mesh = new THREE.Mesh(geometry, wallMat);

        // Position the wall
        const midpoint = {
          x: (wall.start.x + wall.end.x) / 2,
          z: (wall.start.z + wall.end.z) / 2,
        };

        mesh.position.set(midpoint.x, wall.height / 2, midpoint.z);

        // Rotate the wall
        const angle = Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
        mesh.rotation.y = angle;

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { roomId: room.id, wallId: wall.id };

        wallGroupRef.current!.add(mesh);
      });
    });
  }, [rooms, wallMaterial, createWallGeometry, createWallMaterial]);

  // Update floors
  const updateFloors = useCallback(() => {
    if (!floorGroupRef.current || !sceneRef.current) {
      return;
    }

    // Clear existing floors
    floorGroupRef.current.clear();

    const completedRooms = rooms.filter((room) => room.isCompleted);
    if (completedRooms.length === 0) {
      return;
    }

    // Create enhanced floor geometry for all rooms
    const floorGeometry = EnhancedFloorRenderer.createMultiRoomFloorGeometry(
      completedRooms,
      {
        useAdvancedTriangulation: true,
        handleHoles: true,
        generateUVs: true,
        optimizeGeometry: true,
      },
    );

    if (
      floorGeometry.attributes.position &&
      floorGeometry.attributes.position.count > 0
    ) {
      const floorMaterial = createFloorMaterial(floorType);
      const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

      floorMesh.rotation.x = 0; // Keep floors horizontal
      floorMesh.receiveShadow = true;
      floorMesh.userData = { type: 'floor' };

      floorGroupRef.current.add(floorMesh);
    } else {
      console.warn('Enhanced floor rendering produced no geometry, trying fallback');
      updateFloorsWithFallback();
    }
  }, [rooms, floorType, createFloorMaterial]);

  // Fallback floor rendering for complex shapes that fail advanced rendering
  const updateFloorsWithFallback = useCallback(() => {
    if (!floorGroupRef.current || !sceneRef.current) {
      return;
    }

    // Clear existing floors
    floorGroupRef.current.clear();

    const completedRooms = rooms.filter((room) => room.isCompleted);

    completedRooms.forEach((room) => {
      try {
        // Create simple floor geometry using basic triangulation
        const floorGeometry = EnhancedFloorRenderer.createMultiRoomFloorGeometry(
          [room], // Single room at a time
          {
            useAdvancedTriangulation: false, // Use simpler algorithm
            handleHoles: false, // Don't handle holes in fallback
            generateUVs: true,
            optimizeGeometry: false,
          },
        );

        if (
          floorGeometry.attributes.position &&
          floorGeometry.attributes.position.count > 0
        ) {
          const floorMaterial = createFloorMaterial(floorType);
          const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

          floorMesh.rotation.x = 0;
          floorMesh.receiveShadow = true;
          floorMesh.userData = { type: 'floor', roomId: room.id };

          floorGroupRef.current!.add(floorMesh);
        } else {
          console.warn(
            `Failed to create floor for room ${room.id}, using manual geometry`,
          );
          // Last resort: create floor using manual triangulation
          createManualFloorGeometry(room);
        }
      } catch (error) {
        console.warn(`Fallback floor rendering failed for room ${room.id}:`, error);
        createManualFloorGeometry(room);
      }
    });
  }, [rooms, floorType, createFloorMaterial]);

  // Manual floor geometry creation as last resort
  const createManualFloorGeometry = useCallback(
    (room: DrawingRoom) => {
      if (!floorGroupRef.current) {
        return;
      }

      try {
        const vertices = AdvancedRoomDrawing.getRoomVertices(room);
        if (vertices.length < 3) {
          return;
        }

        // Create simple fan triangulation from first vertex
        const geometry = new THREE.BufferGeometry();
        const positions: number[] = [];
        const indices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        // Calculate bounds for UV mapping
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
        vertices.forEach((vertex) => {
          positions.push(vertex.x, 0, vertex.z);
          normals.push(0, 1, 0);
          uvs.push((vertex.x - minX) / width, (vertex.z - minZ) / height);
        });

        // Create fan triangulation from first vertex
        for (let i = 1; i < vertices.length - 1; i++) {
          indices.push(0, i, i + 1);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);

        const floorMaterial = createFloorMaterial(floorType);
        const floorMesh = new THREE.Mesh(geometry, floorMaterial);

        floorMesh.rotation.x = 0;
        floorMesh.receiveShadow = true;
        floorMesh.userData = { type: 'floor', roomId: room.id, method: 'manual' };

        floorGroupRef.current.add(floorMesh);
      } catch (error) {
        console.error(`Manual floor creation failed for room ${room.id}:`, error);
      }
    },
    [floorType, createFloorMaterial],
  );

  // Render loop
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }

    if (controlsRef.current) {
      controlsRef.current.update();
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestAnimationFrame(animate);
  }, []);

  // Take screenshot
  const takeScreenshot = useCallback(() => {
    if (!rendererRef.current || !onScreenshot) {
      return;
    }

    // Render one frame to ensure it's up to date
    if (sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    const canvas = rendererRef.current.domElement;
    const dataURL = canvas.toDataURL('image/png');
    onScreenshot(dataURL);
  }, [onScreenshot]);

  // Initialize scene
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      cleanup = await initializeScene();
    };

    init();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [initializeScene]);

  // Start render loop
  useEffect(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      animate();
    }
  }, [animate]);

  // Update walls when rooms change
  useEffect(() => {
    updateWalls();
  }, [updateWalls]);

  // Update floors when rooms change
  useEffect(() => {
    try {
      updateFloors();
    } catch (error) {
      console.warn('Floor rendering failed, attempting fallback:', error);
      // Attempt fallback floor rendering
      updateFloorsWithFallback();
    }
  }, [updateFloors]);

  // Handle resize
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) {
      return;
    }

    const handleResize = () => {
      const newWidth = mountRef.current?.clientWidth || width;
      const newHeight = mountRef.current?.clientHeight || height;

      cameraRef.current!.aspect = newWidth / newHeight;
      cameraRef.current!.updateProjectionMatrix();
      rendererRef.current!.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  // Expose screenshot functionality
  useEffect(() => {
    if (mountRef.current) {
      (mountRef.current as any).takeScreenshot = takeScreenshot;
    }
  }, [takeScreenshot]);

  return (
    <div ref={mountRef} className={`relative ${className}`} style={{ width, height }}>
      {/* Loading indicator */}
      {!sceneRef.current && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-gray-600">Loading 3D scene...</div>
        </div>
      )}

      {/* Room info overlay */}
      <div className="absolute top-2 left-2 bg-white/90 p-2 rounded shadow">
        <div className="text-sm font-medium">3D View</div>
        <div className="text-xs text-gray-600">
          {rooms.filter((r) => r.isCompleted).length} completed room
          {rooms.filter((r) => r.isCompleted).length !== 1 ? 's' : ''}
        </div>
        {rooms
          .filter((r) => r.isCompleted)
          .map((room) => (
            <div key={room.id} className="text-xs text-gray-500">
              {room.name}: {room.walls.length} walls
            </div>
          ))}
      </div>

      {/* Controls info */}
      <div className="absolute bottom-2 right-2 bg-white/90 p-2 rounded shadow">
        <div className="text-xs text-gray-600 space-y-1">
          <div>Mouse: Rotate view</div>
          <div>Wheel: Zoom</div>
          <div>Right click: Pan</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedThreeCanvas;
