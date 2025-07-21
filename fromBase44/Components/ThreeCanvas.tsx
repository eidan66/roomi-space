
import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ThreeCanvas = ({ 
  walls = [], 
  objects = [], 
  gridEnabled = true, 
  isDarkMode = false,
  selectedObjectId = null,
  onObjectSelect = null,
  onObjectMove = null
}) => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  
  const wallGroupRef = useRef(new THREE.Group());
  const objectGroupRef = useRef(new THREE.Group());
  const gridHelperRef = useRef(null);
  
  // Transform controls state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(new THREE.Vector3());
  const [dragPlane] = useState(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  const palette = {
    primary: '#4FC3F7', 
    secondary: '#FFCA28',
    background: '#F1F6FF',
    darkBg: '#1D1F27',
    accent: '#FF6F91',
    gridLight: 0xCCCCCC,
    gridDark: 0x555555,
    floorLight: 0xF5F5F5,
    floorDark: 0x2A2A2A,
    wood: '#8B4513',
    darkWood: '#654321',
    metal: '#C0C0C0',
    darkMetal: '#808080',
    fabric: '#E6E6FA',
    leafGreen: '#228B22',
    terracotta: '#CD853F',
    selected: '#60A5FA' // New color for selected objects
  };

  // Mouse interaction handlers
  const onMouseMove = useCallback((event) => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDragging && selectedObjectId && onObjectMove) {
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersection = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(dragPlane, intersection);
      
      if (intersection) {
        let newPosition = intersection.sub(dragOffset);
        
        // Optional grid snapping
        if (gridEnabled) {
          newPosition.x = Math.round(newPosition.x * 4) / 4; // 0.25m grid
          newPosition.z = Math.round(newPosition.z * 4) / 4;
        }
        
        // Keep objects on the floor
        newPosition.y = 0;
        
        // Only trigger update if position significantly changed
        const currentObject = objects.find(obj => obj.id === selectedObjectId);
        if (currentObject && (Math.abs(currentObject.position.x - newPosition.x) > 0.01 || Math.abs(currentObject.position.z - newPosition.z) > 0.01)) {
          onObjectMove(selectedObjectId, newPosition);
        }
      }
    }
  }, [isDragging, selectedObjectId, onObjectMove, gridEnabled, dragOffset, objects, dragPlane]);

  const onMouseDown = useCallback((event) => {
    if (event.button !== 0) return; // Only left mouse button
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(objectGroupRef.current.children, true);

    if (intersects.length > 0) {
      // Find the top-level furniture group
      let targetGroup = intersects[0].object;
      while (targetGroup.parent && targetGroup.parent !== objectGroupRef.current) {
        targetGroup = targetGroup.parent;
      }

      if (targetGroup.userData.objectId) {
        // Disable orbit controls during dragging
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }

        setIsDragging(true);
        
        // Calculate drag offset
        const objectPosition = new THREE.Vector3();
        targetGroup.getWorldPosition(objectPosition);
        
        const intersection = new THREE.Vector3();
        raycasterRef.current.ray.intersectPlane(dragPlane, intersection);
        setDragOffset(intersection.sub(objectPosition));

        if (onObjectSelect) {
          onObjectSelect(targetGroup.userData.objectId);
        }
      }
    } else {
      // Clicked on empty space - deselect
      if (onObjectSelect) {
        onObjectSelect(null);
      }
    }
  }, [onObjectSelect, dragPlane]);

  const onMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Re-enable orbit controls
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
  }, [isDragging]);

  useLayoutEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(5, 6, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(isDarkMode ? palette.darkBg : palette.background);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    try {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; 
      controls.dampingFactor = 0.05; 
      controls.maxPolarAngle = Math.PI / 2 - 0.05; 
      controls.minDistance = 3; 
      controls.maxDistance = 30; 
      controls.target.set(0, 1, 0);
      controlsRef.current = controls; 
    } catch (e) {
      console.warn("OrbitControls could not be initialized. Camera will be static.", e);
    }

    scene.add(wallGroupRef.current);
    scene.add(objectGroupRef.current);
    
    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(8, 12, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Secondary light for better illumination
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 8, -5);
    scene.add(fillLight);

    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: isDarkMode ? palette.floorDark : palette.floorLight,
      transparent: true,
      opacity: 0.9
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    gridHelperRef.current = new THREE.GridHelper(50, 200, palette.gridLight, palette.gridLight);
    gridHelperRef.current.material.opacity = 0.3;
    gridHelperRef.current.material.transparent = true;
    scene.add(gridHelperRef.current);

    // Add mouse event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp); // Crucial for when mouse leaves canvas while dragging

    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update(); 
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (currentMount && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = currentMount.clientWidth / currentMount.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.removeEventListener('mousedown', onMouseDown);
        rendererRef.current.domElement.removeEventListener('mousemove', onMouseMove);
        rendererRef.current.domElement.removeEventListener('mouseup', onMouseUp);
        rendererRef.current.domElement.removeEventListener('mouseleave', onMouseUp);
      }
      if (currentMount && rendererRef.current?.domElement) {
        currentMount.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
      if(controlsRef.current) controlsRef.current.dispose();
    };
  }, [isDarkMode, palette.darkBg, palette.background, palette.floorDark, palette.floorLight, palette.gridLight, onMouseDown, onMouseMove, onMouseUp]); // Added palette dependencies for initial setup, and callback dependencies

 