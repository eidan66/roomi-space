'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import {
  DrawingRoom,
  addDrawingPoint,
  cancelCurrentRoom,
  completeCurrentRoom,
  startNewRoom,
} from '@/features/roomSlice';
import { RootState } from '@/features/store';
import { AdvancedRoomDrawing } from '@/lib/advanced-room-drawing';
import { Point, Wall } from '@/types/room';

// Constants
const SCALE = 100; // pixels per meter
const GRID_STEP = 0.5; // 0.5m grid
const SNAP_THRESHOLD = 0.05; // 5cm snap threshold

// Utility functions
const dist = (a: Point, b: Point): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);

const toCanvas = (worldPos: Point): { x: number; y: number } => ({
  x: worldPos.x * SCALE,
  y: -worldPos.z * SCALE, // Flip Z axis for screen coordinates
});

const toWorld = (canvasPos: { x: number; y: number }): Point => ({
  x: canvasPos.x / SCALE,
  z: -canvasPos.y / SCALE, // Flip Z axis back
});

// Room color scheme
const getRoomColor = (
  room: DrawingRoom,
  isPreview = false,
): { fill: string; stroke: string } => {
  const colors = [
    { fill: '#E3F2FD', stroke: '#1976D2' },
    { fill: '#F3E5F5', stroke: '#7B1FA2' },
    { fill: '#E8F5E8', stroke: '#388E3C' },
    { fill: '#FFF3E0', stroke: '#F57C00' },
    { fill: '#FCE4EC', stroke: '#C2185B' },
  ];

  const colorIndex = room.id.charCodeAt(room.id.length - 1) % colors.length;
  const baseColor = colors[colorIndex];

  if (isPreview) {
    return {
      fill: baseColor.fill + '80', // Add transparency
      stroke: baseColor.stroke + '80',
    };
  }

  return baseColor;
};

interface EnhancedFloorplan2DCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export const EnhancedFloorplan2DCanvas: React.FC<EnhancedFloorplan2DCanvasProps> = ({
  width = 800,
  height = 600,
  className = '',
}) => {
  const dispatch = useDispatch();
  const {
    rooms,
    activeRoomId,
    drawingPoints,
    isDrawing,
    editMode,
    gridEnabled,
    snapToGrid,
    wallHeight: _wallHeight,
  } = useSelector((state: RootState) => state.room);

  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, width: 800, height: 600 });
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [_selectedRoom, _setSelectedRoom] = useState<string | null>(null);

  // Get mouse position in world coordinates
  const getMousePos = useCallback(
    (e: React.MouseEvent): Point => {
      if (!svgRef.current) {
        return { x: 0, z: 0 };
      }

      const rect = svgRef.current.getBoundingClientRect();
      const canvasX = ((e.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x;
      const canvasY = ((e.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y;

      return toWorld({ x: canvasX, y: canvasY });
    },
    [viewBox],
  );

  // Get snapped mouse position
  const getSnappedMousePos = useCallback(
    (e: React.MouseEvent): Point => {
      const rawPos = getMousePos(e);

      if (!snapToGrid) {
        return rawPos;
      }

      // Snap to grid
      const snappedPos = {
        x: Math.round(rawPos.x / GRID_STEP) * GRID_STEP,
        z: Math.round(rawPos.z / GRID_STEP) * GRID_STEP,
      };

      // Check for snapping to existing points
      const allWalls = AdvancedRoomDrawing.getAllWalls({
        rooms,
        activeRoomId,
        drawingPoints,
        isDrawing,
      });
      const allPoints: Point[] = [];

      allWalls.forEach((wall) => {
        allPoints.push(wall.start, wall.end);
      });

      // Add drawing points
      allPoints.push(...drawingPoints);

      // Find closest point within snap threshold
      let closestPoint = snappedPos;
      let minDistance = SNAP_THRESHOLD;

      allPoints.forEach((point) => {
        const distance = dist(rawPos, point);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });

      return closestPoint;
    },
    [getMousePos, snapToGrid, rooms, activeRoomId, drawingPoints, isDrawing],
  );

  // Start new room when entering draw mode
  useEffect(() => {
    if (editMode === 'draw' && !isDrawing && !activeRoomId) {
      dispatch(startNewRoom());
    }
  }, [editMode, isDrawing, activeRoomId, dispatch]);

  // Mouse event handlers
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

    if (editMode === 'draw' && isDrawing) {
      const snappedPos = getSnappedMousePos(e);
      setPreviewPoint(snappedPos);

      // Show snap indicator
      if (snapToGrid || drawingPoints.length > 0) {
        setSnapPoint(snappedPos);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (editMode !== 'draw' || isPanning) {
      return;
    }

    const clickPoint = getSnappedMousePos(e);

    // Check if clicking near the first point to close the room
    if (drawingPoints.length >= 3) {
      const firstPoint = drawingPoints[0];
      if (AdvancedRoomDrawing.isPointNearby(clickPoint, firstPoint)) {
        dispatch(completeCurrentRoom());
        return;
      }
    }

    // Add the point to the current room
    dispatch(addDrawingPoint(clickPoint));
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        dispatch(cancelCurrentRoom());
      } else if (e.key === 'Enter' && drawingPoints.length >= 3) {
        dispatch(completeCurrentRoom());
      } else if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        dispatch(startNewRoom());
      }
    },
    [isDrawing, drawingPoints.length, dispatch],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const scale = e.deltaY > 0 ? zoomFactor : 1 / zoomFactor;

    const mousePos = getMousePos(e);
    const mouseCanvasPos = toCanvas(mousePos);

    const newWidth = viewBox.width * scale;
    const newHeight = viewBox.height * scale;

    const newX = mouseCanvasPos.x - (mouseCanvasPos.x - viewBox.x) * scale;
    const newY = mouseCanvasPos.y - (mouseCanvasPos.y - viewBox.y) * scale;

    setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  // Render a wall component
  const renderWall = (wall: Wall, room: DrawingRoom, isPreview = false) => {
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

    const colors = getRoomColor(room, isPreview);
    const cornerSize = 3;

    return (
      <g key={wall.id} className={isPreview ? 'opacity-60' : ''}>
        <polygon
          points={polygonPoints}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="2"
          strokeDasharray={isPreview ? '5,5' : 'none'}
        />

        {/* Wall thickness indicator */}
        <text
          x={(p1.x + p2.x) / 2}
          y={(p1.y + p2.y) / 2}
          fontSize="10"
          textAnchor="middle"
          fill={colors.stroke}
          className="select-none pointer-events-none"
        >
          {(wall.thickness * 100).toFixed(0)}cm
        </text>

        {/* Corner markers */}
        <rect
          x={p1.x - cornerSize}
          y={p1.y - cornerSize}
          width={cornerSize * 2}
          height={cornerSize * 2}
          fill={colors.stroke}
          stroke="#ffffff"
          strokeWidth="1"
        />
        <rect
          x={p2.x - cornerSize}
          y={p2.y - cornerSize}
          width={cornerSize * 2}
          height={cornerSize * 2}
          fill={colors.stroke}
          stroke="#ffffff"
          strokeWidth="1"
        />
      </g>
    );
  };

  // Render drawing points
  const renderDrawingPoints = () => {
    if (!isDrawing || drawingPoints.length === 0) {
      return null;
    }

    return (
      <g>
        {drawingPoints.map((point, index) => {
          const canvasPos = toCanvas(point);
          const isFirst = index === 0;

          return (
            <circle
              key={index}
              cx={canvasPos.x}
              cy={canvasPos.y}
              r={isFirst ? 8 : 5}
              fill={isFirst ? '#FF4444' : '#4444FF'}
              stroke="#FFFFFF"
              strokeWidth="2"
              className={isFirst ? 'animate-pulse' : ''}
            />
          );
        })}

        {/* Preview line to mouse */}
        {previewPoint && drawingPoints.length > 0 && (
          <line
            x1={toCanvas(drawingPoints[drawingPoints.length - 1]).x}
            y1={toCanvas(drawingPoints[drawingPoints.length - 1]).y}
            x2={toCanvas(previewPoint).x}
            y2={toCanvas(previewPoint).y}
            stroke="#888888"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="opacity-60"
          />
        )}
      </g>
    );
  };

  // Render snap indicator
  const renderSnapIndicator = () => {
    if (!snapPoint) {
      return null;
    }

    const canvasPos = toCanvas(snapPoint);
    return (
      <circle
        cx={canvasPos.x}
        cy={canvasPos.y}
        r="6"
        fill="none"
        stroke="#00FF00"
        strokeWidth="2"
        className="animate-pulse"
      />
    );
  };

  // Render room info
  const renderRoomInfo = (room: DrawingRoom) => {
    if (!room.isCompleted) {
      return null;
    }

    try {
      const vertices = AdvancedRoomDrawing.getRoomVertices(room);
      if (vertices.length === 0) {
        return null;
      }

      const centroid = vertices.reduce(
        (acc, vertex) => ({
          x: acc.x + vertex.x / vertices.length,
          z: acc.z + vertex.z / vertices.length,
        }),
        { x: 0, z: 0 },
      );

      const canvasCentroid = toCanvas(centroid);
      const colors = getRoomColor(room);

      // Validate room geometry
      const validation = AdvancedRoomDrawing.validateRoom(room);
      const isValid = validation.isValid;

      return (
        <g key={`info-${room.id}`}>
          <rect
            x={canvasCentroid.x - 50}
            y={canvasCentroid.y - 15}
            width="100"
            height="30"
            fill="rgba(255, 255, 255, 0.9)"
            stroke={isValid ? colors.stroke : '#FF6B6B'}
            strokeWidth={isValid ? '1' : '2'}
            rx="5"
          />
          <text
            x={canvasCentroid.x}
            y={canvasCentroid.y - 5}
            fontSize="12"
            textAnchor="middle"
            fill={isValid ? colors.stroke : '#FF6B6B'}
            className="font-medium"
          >
            {room.name}
          </text>
          <text
            x={canvasCentroid.x}
            y={canvasCentroid.y + 8}
            fontSize="10"
            textAnchor="middle"
            fill={isValid ? '#666666' : '#FF6B6B'}
          >
            {isValid ? `${room.walls.length} walls` : 'Invalid'}
          </text>
        </g>
      );
    } catch (error) {
      console.warn(`Failed to render room info for ${room.id}:`, error);
      return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="border border-gray-300 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {/* Grid patterns */}
          <pattern
            id="grid-minor"
            width={GRID_STEP * SCALE}
            height={GRID_STEP * SCALE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_STEP * SCALE} 0 L 0 0 0 ${GRID_STEP * SCALE}`}
              fill="none"
              stroke="rgba(200, 200, 250, 0.3)"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="grid-major"
            width={GRID_STEP * SCALE * 4}
            height={GRID_STEP * SCALE * 4}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_STEP * SCALE * 4} 0 L 0 0 0 ${GRID_STEP * SCALE * 4}`}
              fill="none"
              stroke="rgba(180, 180, 220, 0.6)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Grid */}
        {gridEnabled && (
          <>
            <rect
              x={viewBox.x}
              y={viewBox.y}
              width={viewBox.width}
              height={viewBox.height}
              fill="url(#grid-minor)"
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

        {/* Render completed rooms */}
        {rooms
          .filter((room) => room.isCompleted)
          .map((room) => (
            <g key={room.id}>
              {room.walls.map((wall) => renderWall(wall, room))}
              {renderRoomInfo(room)}
            </g>
          ))}

        {/* Render active room being drawn */}
        {activeRoomId &&
          rooms
            .find((r) => r.id === activeRoomId)
            ?.walls.map((wall) => {
              const activeRoom = rooms.find((r) => r.id === activeRoomId)!;
              return renderWall(wall, activeRoom, true);
            })}

        {/* Render drawing points and preview */}
        {renderDrawingPoints()}
        {renderSnapIndicator()}
      </svg>

      {/* Status bar */}
      <div className="absolute bottom-2 left-2 bg-white/90 px-3 py-1 rounded shadow text-sm">
        {isDrawing ? (
          <span className="text-blue-600">
            Drawing {drawingPoints.length > 0 ? `(${drawingPoints.length} points)` : ''}
            {drawingPoints.length >= 3 && ' - Click first point to close'}
          </span>
        ) : (
          <span className="text-gray-600">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} created
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="absolute top-2 right-2 bg-white/90 p-2 rounded shadow">
        <div className="text-xs text-gray-600 mb-1">Controls:</div>
        <div className="text-xs space-y-1">
          <div>Click: Add point</div>
          <div>ESC: Cancel room</div>
          <div>Enter: Complete room</div>
          <div>Ctrl+N: New room</div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFloorplan2DCanvas;
