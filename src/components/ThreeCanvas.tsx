'use client';

import React, { useEffect, useRef, useState } from 'react';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { Wall, RoomObject, Door, Window } from '@/types/room';

interface ThreeCanvasProps {
  walls: Wall[];
  objects?: RoomObject[];
  doors?: Door[];
  windows?: Window[];
  gridEnabled: boolean;
  isDarkMode: boolean;
  selectedObjectId?: string | null;
  selectedWallId?: string | null;
  selectedDoorId?: string | null;
  selectedWindowId?: string | null;
  onObjectSelect?: (objectId: string | null) => void;
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3) => void;
  onWallSelect?: (wallId: string | null) => void;
  onDoorSelect?: (doorId: string | null) => void;
  onWindowSelect?: (windowId: string | null) => void;
  onCanvasClick?: (point: { x: number; z: number }) => void;
  drawingStart?: { x: number; z: number } | null;
  isDrawing?: boolean;
  selectedTool?: string;
  viewMode?: '2d' | '3d';
  firstPersonMode?: boolean;
  hudEnabled?: boolean;
  selectedColor?: string;
  floorColor?: string;
  roomSize?: { width: number; length: number };
}

const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  walls,
  objects = [],
  doors = [],
  windows = [],
  gridEnabled,
  isDarkMode,
  selectedObjectId,
  selectedWallId,
  selectedDoorId,
  selectedWindowId,
  onObjectSelect,
  onObjectMove,
  onWallSelect,
  onDoorSelect,
  onWindowSelect,
  onCanvasClick,
  drawingStart,
  isDrawing,
  selectedTool,
  viewMode = '3d',
  firstPersonMode = false,
  hudEnabled = true,
  selectedColor = '#a0aec0',
  floorColor = '#f0f0f0',
  roomSize = { width: 12, length: 6 },
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedMesh, setSelectedMesh] = useState<THREE.Mesh | null>(null);
  const [transformControls, setTransformControls] = useState<TransformControls | null>(
    null,
  );

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const currentMount = mountRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x1a202c : 0xf0f2f5);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000,
    );

    // Set camera position based on view mode and first person mode
    if (firstPersonMode) {
      camera.position.set(0, 1.7, 0); // Human eye level
      camera.lookAt(1, 1.7, 0);
    } else if (viewMode === '2d') {
      camera.position.set(0, 20, 0); // Top-down view
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(
        roomSize.width * 0.8,
        roomSize.length * 0.6,
        roomSize.width * 0.8,
      );
      camera.lookAt(0, 0, 0);
    }

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.shadowMap.enabled = true;
    currentMount.innerHTML = ''; // Clear previous renderer
    currentMount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2; // Don't allow going below ground

    // Restrict controls in first person mode
    if (firstPersonMode) {
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.maxPolarAngle = Math.PI;
      controls.minPolarAngle = 0;
    }

    // Transform controls for object manipulation
    const transformControl = new TransformControls(camera, renderer.domElement);
    scene.add(transformControl as any);
    setTransformControls(transformControl);

    // Handle tool modes for transform controls
    if (selectedTool === 'drag' && selectedObjectId) {
      transformControl.setMode('translate');
      transformControl.showX = true;
      transformControl.showY = true;
      transformControl.showZ = true;
    } else if (selectedTool === 'resize' && selectedObjectId) {
      transformControl.setMode('scale');
    } else {
      transformControl.detach();
    }

    // Disable orbit controls when using transform controls
    transformControl.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
    });

    // Enhanced Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    // Add point lights for better illumination
    const pointLight1 = new THREE.PointLight(0xffffff, 0.3, 100);
    pointLight1.position.set(roomSize.width / 2, 3, roomSize.length / 2);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.3, 100);
    pointLight2.position.set(-roomSize.width / 2, 3, -roomSize.length / 2);
    scene.add(pointLight2);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(
      roomSize.width * 2,
      roomSize.length * 2,
    );
    const floorMaterial = new THREE.MeshLambertMaterial({
      color: floorColor,
      transparent: true,
      opacity: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Helper
    const gridHelper = gridEnabled
      ? new THREE.GridHelper(roomSize.width * 2, roomSize.width * 2, 0x444444, 0x444444)
      : null;
    if (gridHelper) {
      gridHelper.position.y = 0;
      scene.add(gridHelper);
    }

    // Raycaster for mouse interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Wall rendering logic
    const wallGroup = new THREE.Group();
    scene.add(wallGroup);

    const renderWalls = () => {
      wallGroup.children.forEach((child) => wallGroup.remove(child)); // Clear existing walls

      walls.forEach((wall) => {
        const wallVector = new THREE.Vector3().subVectors(
          new THREE.Vector3(wall.end.x, wall.end.y, wall.end.z),
          new THREE.Vector3(wall.start.x, wall.start.y, wall.start.z),
        );
        const wallLength = wallVector.length();
        const wallGeometry = new THREE.BoxGeometry(
          wallLength,
          wall.height,
          wall.thickness,
        );

        const isSelected = selectedWallId === wall.id;
        const wallColor = wall.color || (isDarkMode ? '#5a6a7a' : '#a0aec0');
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: isSelected ? '#3b82f6' : wallColor,
          transparent: isSelected,
          opacity: isSelected ? 0.8 : 1.0,
        });

        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.userData.id = wall.id;
        wallMesh.userData.type = 'wall';

        wallMesh.position.set(
          (wall.start.x + wall.end.x) / 2,
          wall.height / 2,
          (wall.start.z + wall.end.z) / 2,
        );
        wallMesh.rotation.y = Math.atan2(wallVector.x, wallVector.z);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;

        wallGroup.add(wallMesh);

        // Add wireframe for selected wall
        if (isSelected) {
          const wireframe = new THREE.WireframeGeometry(wallGeometry);
          const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6 });
          const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
          wireframeMesh.position.copy(wallMesh.position);
          wireframeMesh.rotation.copy(wallMesh.rotation);
          wallGroup.add(wireframeMesh);
        }
      });
    };

    renderWalls();

    // Drawing preview
    const drawingGroup = new THREE.Group();
    scene.add(drawingGroup);

    const renderDrawingPreview = () => {
      drawingGroup.children.forEach((child) => drawingGroup.remove(child));

      if (isDrawing && drawingStart) {
        // Add start point indicator
        const startGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const startMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const startMesh = new THREE.Mesh(startGeometry, startMaterial);
        startMesh.position.set(drawingStart.x, 0.1, drawingStart.z);
        drawingGroup.add(startMesh);
      }
    };

    renderDrawingPreview();

    // Enhanced Object rendering logic
    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    const createObjectGeometry = (type: string) => {
      switch (type) {
        case 'sofa':
          return new THREE.BoxGeometry(2.5, 0.8, 1.2);
        case 'chair':
          return new THREE.BoxGeometry(0.6, 1.2, 0.6);
        case 'table':
          return new THREE.BoxGeometry(1.5, 0.8, 0.8);
        case 'nightstand':
          return new THREE.BoxGeometry(0.5, 0.6, 0.4);
        case 'bed':
          return new THREE.BoxGeometry(2.0, 0.6, 1.8);
        case 'wardrobe':
          return new THREE.BoxGeometry(1.2, 2.2, 0.6);
        case 'bookshelf':
          return new THREE.BoxGeometry(1.0, 2.0, 0.3);
        case 'desk':
          return new THREE.BoxGeometry(1.4, 0.8, 0.8);
        case 'rug_small':
          return new THREE.PlaneGeometry(1.5, 1.0);
        case 'rug_medium':
          return new THREE.PlaneGeometry(2.5, 1.8);
        case 'rug_large':
          return new THREE.PlaneGeometry(3.5, 2.5);
        case 'carpet_persian':
        case 'carpet_modern':
          return new THREE.PlaneGeometry(3.0, 2.0);
        case 'table_lamp':
        case 'desk_lamp':
          return new THREE.CylinderGeometry(0.15, 0.15, 0.4);
        case 'floor_lamp':
          return new THREE.CylinderGeometry(0.1, 0.1, 1.6);
        case 'ceiling_lamp':
        case 'pendant_light':
          return new THREE.SphereGeometry(0.3);
        case 'tv':
          return new THREE.BoxGeometry(1.2, 0.7, 0.1);
        case 'refrigerator':
          return new THREE.BoxGeometry(0.6, 1.8, 0.6);
        case 'microwave':
          return new THREE.BoxGeometry(0.5, 0.3, 0.4);
        case 'washing_machine':
          return new THREE.BoxGeometry(0.6, 0.9, 0.6);
        case 'dishwasher':
          return new THREE.BoxGeometry(0.6, 0.8, 0.6);
        case 'oven':
          return new THREE.BoxGeometry(0.6, 0.6, 0.6);
        case 'vase':
          return new THREE.CylinderGeometry(0.1, 0.15, 0.3);
        case 'plant':
          return new THREE.SphereGeometry(0.3);
        case 'picture_frame':
          return new THREE.BoxGeometry(0.4, 0.6, 0.05);
        case 'candle':
          return new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        case 'sculpture':
          return new THREE.BoxGeometry(0.2, 0.4, 0.2);
        case 'mirror':
          return new THREE.BoxGeometry(0.8, 1.2, 0.05);
        case 'clock':
          return new THREE.CylinderGeometry(0.2, 0.2, 0.05);
        default:
          return new THREE.BoxGeometry(0.5, 0.5, 0.5);
      }
    };

    const renderObjects = () => {
      objectGroup.children.forEach((child) => objectGroup.remove(child));

      objects.forEach((obj) => {
        const geometry = createObjectGeometry(obj.type);
        const material = new THREE.MeshStandardMaterial({
          color: obj.color,
          transparent: obj.type.includes('rug') || obj.type.includes('carpet'),
          opacity: obj.type.includes('rug') || obj.type.includes('carpet') ? 0.8 : 1.0,
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Position handling for different object types
        if (obj.type.includes('rug') || obj.type.includes('carpet')) {
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(obj.position.x, 0.01, obj.position.z);
        } else if (obj.type === 'ceiling_lamp' || obj.type === 'pendant_light') {
          mesh.position.set(obj.position.x, 2.3, obj.position.z);
        } else {
          geometry.computeBoundingBox();
          const height = geometry.boundingBox
            ? geometry.boundingBox.max.y - geometry.boundingBox.min.y
            : 0.5;
          mesh.position.set(obj.position.x, obj.position.y + height / 2, obj.position.z);
        }

        mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
        mesh.userData = {
          id: obj.id,
          type: 'object',
          objectType: obj.type,
          canHost: [
            'sofa',
            'table',
            'nightstand',
            'bed',
            'bookshelf',
            'desk',
            'rug_small',
            'rug_medium',
            'rug_large',
            'carpet_persian',
            'carpet_modern',
            'refrigerator',
            'washing_machine',
            'oven',
          ].includes(obj.type),
          canStack: [
            'table_lamp',
            'desk_lamp',
            'vase',
            'plant',
            'picture_frame',
            'candle',
            'sculpture',
            'clock',
            'tv',
            'microwave',
          ].includes(obj.type),
        };
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Highlight selected object
        if (selectedObjectId === obj.id) {
          const wireframe = new THREE.WireframeGeometry(geometry);
          const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
          const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
          wireframeMesh.position.copy(mesh.position);
          wireframeMesh.rotation.copy(mesh.rotation);
          wireframeMesh.scale.copy(mesh.scale);
          objectGroup.add(wireframeMesh);

          // Attach transform controls to selected object
          if (
            transformControl &&
            (selectedTool === 'drag' || selectedTool === 'resize')
          ) {
            transformControl.attach(mesh);
          }
        }

        objectGroup.add(mesh);
      });
    };

    renderObjects();

    // Mouse event handlers
    const handleMouseClick = (event: MouseEvent) => {
      if (!currentMount) return;

      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check for wall intersections first
      const wallIntersects = raycaster.intersectObjects(
        wallGroup.children.filter((child) => child.userData.type === 'wall'),
      );

      if (wallIntersects.length > 0 && selectedTool === 'select') {
        const wallId = wallIntersects[0].object.userData.id;
        onWallSelect?.(wallId);
        return;
      }

      // Check for ground plane intersection for drawing
      if (selectedTool === 'wall' && onCanvasClick) {
        // Create a large ground plane for intersection
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = 0;

        const groundIntersects = raycaster.intersectObject(groundMesh);
        if (groundIntersects.length > 0) {
          const point = groundIntersects[0].point;
          onCanvasClick({ x: point.x, z: point.z });
        }
      }

      // Deselect if clicking empty space
      if (selectedTool === 'select') {
        onWallSelect?.(null);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!currentMount || !isDrawing || !drawingStart) return;

      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Create a ground plane for intersection
      const groundGeometry = new THREE.PlaneGeometry(100, 100);
      const groundMaterial = new THREE.MeshBasicMaterial({ visible: false });
      const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.y = 0;

      const groundIntersects = raycaster.intersectObject(groundMesh);
      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point;

        // Update drawing preview
        drawingGroup.children.forEach((child) => drawingGroup.remove(child));

        // Start point
        const startGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const startMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const startMesh = new THREE.Mesh(startGeometry, startMaterial);
        startMesh.position.set(drawingStart.x, 0.1, drawingStart.z);
        drawingGroup.add(startMesh);

        // Preview line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(drawingStart.x, 0.1, drawingStart.z),
          new THREE.Vector3(point.x, 0.1, point.z),
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        drawingGroup.add(line);

        // End point
        const endGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const endMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const endMesh = new THREE.Mesh(endGeometry, endMaterial);
        endMesh.position.set(point.x, 0.1, point.z);
        drawingGroup.add(endMesh);
      }
    };

    // Add event listeners
    currentMount.addEventListener('click', handleMouseClick);
    currentMount.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (currentMount) {
        currentMount.removeEventListener('click', handleMouseClick);
        currentMount.removeEventListener('mousemove', handleMouseMove);
        currentMount.innerHTML = '';
      }
    };
  }, [
    walls,
    objects,
    gridEnabled,
    isDarkMode,
    selectedObjectId,
    selectedWallId,
    onObjectSelect,
    onObjectMove,
    onWallSelect,
    onCanvasClick,
    drawingStart,
    isDrawing,
    selectedTool,
  ]);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default ThreeCanvas;
