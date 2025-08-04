import React, { useCallback, useEffect, useRef, useState } from 'react';

// --- Types ---
interface Point {
  x: number;
  z: number;
}
export interface Wall {
  // Exporting for parent component
  id: string;
  start: Point;
  end: Point;
  height: number;
  thickness: number;
}
interface Floorplan2DCanvasProps {
  walls: Wall[];
  setWalls: React.Dispatch<React.SetStateAction<Wall[]>>;
  mode: 'draw' | 'move' | 'delete' | 'idle';
  setMode: React.Dispatch<React.SetStateAction<'draw' | 'move' | 'delete' | 'idle'>>;
  wallHeight?: number;
  wallThickness?: number;
  onWallsChange?: () => void;
  gridSnapping?: boolean;
}

// --- Constants ---
const GRID_STEP = 1; // 1 meter
const SCALE = 25; // pixels per meter
const SNAP_THRESHOLD = 0.5; // meters
const SNAP_RADIUS = 10; // pixels

// --- Helper Functions ---
const toCanvas = (pt: Point): { x: number; y: number } => ({
  x: pt.x * SCALE,
  y: -pt.z * SCALE,
});

const toWorld = (pt: { x: number; y: number }): Point => ({
  x: pt.x / SCALE,
  z: -pt.y / SCALE,
});

const dist = (a: Point, b: Point): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);

const wallToPoints = (walls: Wall[]): Point[] => {
  const points: Point[] = [];
  walls.forEach((wall) => {
    if (!points.some((p) => dist(p, wall.start) < 0.01)) {
      points.push(wall.start);
    }
    if (!points.some((p) => dist(p, wall.end) < 0.01)) {
      points.push(wall.end);
    }
  });
  return points;
};

// --- Wall Sub-Component ---
const WallComponent: React.FC<{ wall: Wall; isPreview?: boolean }> = ({
  wall,
  isPreview = false,
}) => {
  const p1 = toCanvas(wall.start);
  const p2 = toCanvas(wall.end);
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const thickness = (wall.thickness * SCALE) / 2;

  const polygonPoints = [
    { x: p1.x - Math.sin(angle) * thickness, y: p1.y + Math.cos(angle) * thickness },
    { x: p2.x - Math.sin(angle) * thickness, y: p2.y + Math.cos(angle) * thickness },
    { x: p2.x + Math.sin(angle) * thickness, y: p2.y - Math.cos(angle) * thickness },
    { x: p1.x + Math.sin(angle) * thickness, y: p1.y - Math.cos(angle) * thickness },
  ]
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  const length = dist(wall.start, wall.end);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  // Corner marker size
  const cornerSize = 3;

  return (
    <g className={isPreview ? 'opacity-60' : ''}>
      <polygon
        points={polygonPoints}
        fill={isPreview ? '#CBD5E0' : '#E2E8F0'}
        stroke={isPreview ? '#94A3B8' : '#A0AEC0'}
        strokeWidth="1"
        strokeDasharray={isPreview ? '5,5' : 'none'}
      />

      {/* Corner markers - blueprint style */}
      <circle
        cx={p1.x}
        cy={p1.y}
        r={cornerSize}
        fill="#1E40AF"
        stroke="#1E3A8A"
        strokeWidth="1"
      />
      <circle
        cx={p2.x}
        cy={p2.y}
        r={cornerSize}
        fill="#1E40AF"
        stroke="#1E3A8A"
        strokeWidth="1"
      />

      {length >= 0.5 && (
        <text
          x={midX}
          y={midY - 10}
          fontSize="12"
          fill="#4A5568"
          textAnchor="middle"
          style={{ userSelect: 'none' }}
        >
          {length < 1 ? `${Math.round(length * 100)} cm` : `${length.toFixed(2)} m`}
        </text>
      )}
    </g>
  );
};

// --- Main Canvas Component ---
const Floorplan2DCanvas: React.FC<Floorplan2DCanvasProps> = ({
  walls,
  setWalls,
  mode,
  setMode,
  wallHeight = 2.8,
  wallThickness = 0.25,
  onWallsChange,
  gridSnapping = true,
}) => {
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);

  const [viewBox, setViewBox] = useState({ x: -400, y: -300, width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);

  const svgRef = useRef<SVGSVGElement>(null);
  const lastMousePosRef = useRef<Point>({ x: 0, z: 0 });

  // --- Coordinate & Snapping Logic ---
  const getMousePos = (e: React.MouseEvent): Point => {
    if (!svgRef.current) {
      return { x: 0, z: 0 };
    }
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const transformedPoint = svgPoint.matrixTransform(
      svgRef.current.getScreenCTM()?.inverse(),
    );
    return toWorld(transformedPoint);
  };

  const getSnappedMousePos = (e: React.MouseEvent): Point => {
    const worldPos = getMousePos(e);
    lastMousePosRef.current = worldPos;

    // Try to snap to existing points first
    const allPoints = wallToPoints(walls);
    for (const point of allPoints) {
      if (dist(worldPos, point) < SNAP_THRESHOLD) {
        setSnapPoint(point);
        return point;
      }
    }

    // Try to snap to existing wall lines
    for (const wall of walls) {
      const wallVector = {
        x: wall.end.x - wall.start.x,
        z: wall.end.z - wall.start.z,
      };
      const wallLength = Math.sqrt(wallVector.x ** 2 + wallVector.z ** 2);

      if (wallLength < 0.1) {
        continue;
      }

      // Normalize wall vector
      const wallDir = {
        x: wallVector.x / wallLength,
        z: wallVector.z / wallLength,
      };

      // Vector from wall start to mouse
      const toMouse = {
        x: worldPos.x - wall.start.x,
        z: worldPos.z - wall.start.z,
      };

      // Project mouse position onto wall line
      const projection = toMouse.x * wallDir.x + toMouse.z * wallDir.z;

      // Check if projection is within wall segment
      if (projection >= 0 && projection <= wallLength) {
        // Calculate perpendicular distance to wall
        const perpDist = Math.abs(toMouse.x * wallDir.z - toMouse.z * wallDir.x);

        if (perpDist < SNAP_THRESHOLD) {
          // Snap to wall line
          const snapped = {
            x: wall.start.x + wallDir.x * projection,
            z: wall.start.z + wallDir.z * projection,
          };
          setSnapPoint(snapped);
          return snapped;
        }
      }
    }

    // If no snap, use grid only if grid snapping is enabled
    setSnapPoint(null);
    if (gridSnapping) {
      return {
        x: Math.round(worldPos.x / GRID_STEP) * GRID_STEP,
        z: Math.round(worldPos.z / GRID_STEP) * GRID_STEP,
      };
    }
    return worldPos;
  };

  // --- Wall Change Callback ---
  useEffect(() => {
    if (onWallsChange) {
      onWallsChange();
    }
  }, [walls, onWallsChange]);

  // --- State & Mode Management ---
  const finishCurrentMode = useCallback(() => {
    setMode('idle');
    setDrawingPoints([]);
    setPreviewPoint(null);
    setIsDragging(false);
    setSelectedPoint(null);
  }, [setMode]);

  const addWallSegment = useCallback(
    (start: Point, end: Point) => {
      // Don't add walls that are too short
      if (dist(start, end) < 0.1) {
        return;
      }

      const newWall: Wall = {
        id: `wall-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        start,
        end,
        height: wallHeight,
        thickness: wallThickness,
      };
      setWalls((prevWalls) => [...prevWalls, newWall]);
    },
    [setWalls, wallHeight, wallThickness],
  );

  // --- Mouse Event Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      // Middle or right mouse for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDragging && selectedPoint && mode === 'move') {
      const newPos = getSnappedMousePos(e);
      const updatedWalls = walls.map((wall) => {
        if (dist(wall.start, selectedPoint) < 0.01) {
          return { ...wall, start: newPos };
        }
        if (dist(wall.end, selectedPoint) < 0.01) {
          return { ...wall, end: newPos };
        }
        return wall;
      });
      setWalls(updatedWalls);
      setSelectedPoint(newPos);
      return;
    }

    if (mode === 'draw') {
      const snappedPos = getSnappedMousePos(e);
      setPreviewPoint(snappedPos);
    } else {
      setPreviewPoint(null);
      setSnapPoint(null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (isDragging) {
      setIsDragging(false);
      setSelectedPoint(null);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode === 'delete') {
      const clickPos = getMousePos(e);
      // Find wall near click
      let wallToDelete: Wall | null = null;
      const threshold = 0.25; // meters
      for (const wall of walls) {
        const v = { x: wall.end.x - wall.start.x, z: wall.end.z - wall.start.z };
        const wLen = Math.sqrt(v.x * v.x + v.z * v.z);
        if (wLen < 0.01) {
          continue;
        }
        const dir = { x: v.x / wLen, z: v.z / wLen };
        const toClick = { x: clickPos.x - wall.start.x, z: clickPos.z - wall.start.z };
        const proj = toClick.x * dir.x + toClick.z * dir.z;
        if (proj < 0 || proj > wLen) {
          continue;
        }
        // perpendicular distance
        const perp = Math.abs(toClick.x * dir.z - toClick.z * dir.x);
        if (perp < threshold) {
          wallToDelete = wall;
          break;
        }
      }
      if (wallToDelete) {
        setWalls((prev) => prev.filter((w) => w.id !== wallToDelete!.id));
        if (onWallsChange) {
          onWallsChange();
        }
      }
      return;
    }
    if (mode !== 'draw') {
      return;
    }
    const pt = getSnappedMousePos(e);

    if (drawingPoints.length > 0) {
      const last = drawingPoints[drawingPoints.length - 1];
      if (dist(pt, last) < 0.1) {
        return; // Prevent double-clicks
      }

      // Check if clicking near any existing point (other than the last one) to close the shape
      for (let i = 0; i < drawingPoints.length - 1; i++) {
        if (dist(pt, drawingPoints[i]) < SNAP_THRESHOLD) {
          addWallSegment(last, drawingPoints[i]);
          finishCurrentMode();
          return;
        }
      }

      addWallSegment(last, pt);
    }
    setDrawingPoints((prev) => [...prev, pt]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const scale = e.deltaY > 0 ? zoomFactor : 1 / zoomFactor;

    // Get mouse position in world coordinates for zoom centering
    const mousePos = getMousePos(e);
    const mouseCanvasPos = toCanvas(mousePos);

    const newWidth = viewBox.width * scale;
    const newHeight = viewBox.height * scale;

    // Calculate new viewbox position to zoom toward mouse
    const newX = mouseCanvasPos.x - (mouseCanvasPos.x - viewBox.x) * scale;
    const newY = mouseCanvasPos.y - (mouseCanvasPos.y - viewBox.y) * scale;

    setViewBox({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  };

  // --- Double Click to End Drawing ---
  const handleDoubleClick = (_e: React.MouseEvent) => {
    if (mode === 'draw' && drawingPoints.length >= 3) {
      // Close the shape
      const first = drawingPoints[0];
      const last = drawingPoints[drawingPoints.length - 1];
      if (dist(first, last) > 0.1) {
        addWallSegment(last, first);
      }
      finishCurrentMode();
    }
  };

  // --- Context Menu (Right Click) ---
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (mode === 'draw') {
      finishCurrentMode();
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishCurrentMode();
      }

      // Delete key to remove selected point and connected walls
      if (e.key === 'Delete' && selectedPoint) {
        setWalls((prevWalls) =>
          prevWalls.filter(
            (wall) =>
              dist(wall.start, selectedPoint) > 0.01 &&
              dist(wall.end, selectedPoint) > 0.01,
          ),
        );
        setSelectedPoint(null);
      }

      // Grid toggle
      if (e.key === 'g' || e.key === 'G') {
        setGridEnabled((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finishCurrentMode, selectedPoint, setWalls]);

  // --- Prevent page scrolling when zooming in 2D canvas ---
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    svgElement.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      svgElement.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  const allDrawablePoints = wallToPoints(walls);
  const wallsToRender = [...walls];
  if (mode === 'draw' && drawingPoints.length > 0 && previewPoint) {
    wallsToRender.push({
      id: 'preview',
      start: drawingPoints[drawingPoints.length - 1],
      end: previewPoint,
      thickness: wallThickness,
      height: wallHeight,
    });
  }

  // --- Auto-center on first render ---
  useEffect(() => {
    if (walls.length > 0 && svgRef.current) {
      // Calculate bounding box
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

      // Add padding
      const padding = 2; // meters
      minX -= padding;
      maxX += padding;
      minZ -= padding;
      maxZ += padding;

      const width = (maxX - minX) * SCALE;
      const height = (maxZ - minZ) * SCALE;

      if (width > 0 && height > 0) {
        const centerX = ((minX + maxX) / 2) * SCALE;
        const centerZ = (-(minZ + maxZ) / 2) * SCALE;

        setViewBox({
          x: centerX - width / 2,
          y: centerZ - height / 2,
          width: width,
          height: height,
        });
      }
    }
  }, [walls]); // Run when walls change

  // Update walls when they change
  useEffect(() => {
    if (onWallsChange) {
      onWallsChange();
    }
  }, [walls, onWallsChange]);

  return (
    <div className="relative w-full h-full bg-gray-50">
      {/* --- SVG Canvas --- */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        style={{
          cursor: (() => {
            if (mode === 'draw') {
              return 'crosshair';
            }
            if (isPanning) {
              return 'grabbing';
            }
            return 'default';
          })(),
        }}
      >
        <defs>
          <pattern
            id="grid"
            width={GRID_STEP * SCALE}
            height={GRID_STEP * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_STEP * SCALE} 0 L 0 0 0 ${GRID_STEP * SCALE}`}
              fill="none"
              stroke="rgba(200, 200, 250, 0.5)"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="grid-major"
            width={GRID_STEP * SCALE * 5}
            height={GRID_STEP * SCALE * 5}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_STEP * SCALE * 5} 0 L 0 0 0 ${GRID_STEP * SCALE * 5}`}
              fill="none"
              stroke="rgba(180, 180, 220, 0.8)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        {gridEnabled && mode !== 'idle' && (
          <>
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.width}
              height={viewBox.height}
              fill="url(#grid)"
            />
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.width}
              height={viewBox.height}
              fill="url(#grid-major)"
            />
          </>
        )}

        {/* Render Walls */}
        {wallsToRender.map((wall) => (
          <WallComponent key={wall.id} wall={wall} isPreview={wall.id === 'preview'} />
        ))}

        {/* Render Points for Moving */}
        {mode === 'move' &&
          allDrawablePoints.map((p, i) => (
            <circle
              key={i}
              cx={toCanvas(p).x}
              cy={toCanvas(p).y}
              r="8"
              className="cursor-move fill-blue-500 hover:fill-blue-700 opacity-50 hover:opacity-100"
              onMouseDown={(e) => {
                e.stopPropagation(); // Prevent canvas click
                setIsDragging(true);
                setSelectedPoint(p);
              }}
            />
          ))}

        {/* Snap Point Indicator */}
        {snapPoint && mode === 'draw' && (
          <circle
            cx={toCanvas(snapPoint).x}
            cy={toCanvas(snapPoint).y}
            r={SNAP_RADIUS}
            className="fill-green-500 opacity-50"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Drawing Points */}
        {mode === 'draw' &&
          drawingPoints.map((p, i) => (
            <circle
              key={i}
              cx={toCanvas(p).x}
              cy={toCanvas(p).y}
              r="5"
              className={i === 0 ? 'fill-green-600' : 'fill-blue-600'}
              style={{ pointerEvents: 'none' }}
            />
          ))}

        {/* First Point Highlight (for closing the shape) */}
        {mode === 'draw' && drawingPoints.length >= 2 && (
          <circle
            cx={toCanvas(drawingPoints[0]).x}
            cy={toCanvas(drawingPoints[0]).y}
            r="10"
            className="fill-transparent stroke-green-600 stroke-2"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {/* Instruction Overlay */}
      {mode === 'draw' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-80 px-4 py-2 rounded-md shadow-lg text-sm">
          {(() => {
            if (drawingPoints.length === 0) {
              return 'Click to start drawing walls';
            }
            if (drawingPoints.length < 3) {
              return 'Continue clicking to add walls';
            }
            return 'Click on the first point or double-click to close the shape';
          })()}
        </div>
      )}
    </div>
  );
};

export default Floorplan2DCanvas;
