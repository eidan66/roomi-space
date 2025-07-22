'use client';

import React, { useEffect, useRef } from 'react';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

type Wall = {
  id: string;
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  height: number;
  thickness: number;
};

type RoomObject = {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
};

interface ThreeCanvasProps {
  walls: Wall[];
  objects?: RoomObject[];
  gridEnabled: boolean;
  isDarkMode: boolean;
  selectedObjectId?: string | null;
  onObjectSelect?: (objectId: string | null) => void;
  onObjectMove?: (objectId: string, newPosition: THREE.Vector3) => void;
}

const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  walls,
  objects = [],
  gridEnabled,
  isDarkMode,
  selectedObjectId,
  onObjectSelect,
  onObjectMove,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const currentMount = mountRef.current;

    // Scene setup - using custom theme colors
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? '#022358' : '#E9EFF5'); // pennBlue : aliceBlue

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.shadowMap.enabled = true;
    currentMount.innerHTML = ''; // Clear previous renderer
    currentMount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grid Helper with theme colors
    const gridHelper = gridEnabled
      ? new THREE.GridHelper(
          20,
          20,
          isDarkMode ? '#4C617D' : '#627690', // paynesGray : slateGray
          isDarkMode ? '#657fa0' : '#bfc8d3', // border colors
        )
      : null;
    if (gridHelper) {
      scene.add(gridHelper);
    }

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
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: isDarkMode ? 0x5a6a7a : 0xa0aec0,
        });
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);

        wallMesh.position.set(
          (wall.start.x + wall.end.x) / 2,
          wall.height / 2,
          (wall.start.z + wall.end.z) / 2,
        );
        wallMesh.rotation.y = Math.atan2(wallVector.x, wallVector.z);
        wallMesh.castShadow = true;
        wallMesh.receiveShadow = true;

        wallGroup.add(wallMesh);
      });
    };

    renderWalls();

    // Object rendering logic
    const objectGroup = new THREE.Group();
    scene.add(objectGroup);

    const renderObjects = () => {
      objectGroup.children.forEach((child) => objectGroup.remove(child));

      objects.forEach((obj) => {
        let geometry;
        // Simple geometry based on type
        switch (obj.type) {
          case 'table':
            geometry = new THREE.BoxGeometry(1.5, 0.8, 0.8);
            break;
          case 'chair':
          default:
            geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
            break;
        }
        const material = new THREE.MeshStandardMaterial({ color: obj.color });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(obj.position.x, obj.position.y + 0.5, obj.position.z);
        mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z);
        mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
        mesh.userData.id = obj.id;

        objectGroup.add(mesh);
      });
    };

    renderObjects();

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
        currentMount.innerHTML = '';
      }
    };
  }, [
    walls,
    objects,
    gridEnabled,
    isDarkMode,
    selectedObjectId,
    onObjectSelect,
    onObjectMove,
  ]);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default ThreeCanvas;
