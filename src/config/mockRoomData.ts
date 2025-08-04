import type { Room } from '../types/room';

export const mockRooms: Room[] = [
  {
    id: 'room-1',
    userId: 'user-1',
    name: 'My Dream Room',
    walls: [
      {
        id: 'wall-1',
        start: { x: 0, z: 0 },
        end: { x: 400, z: 0 },
        height: 250,
        thickness: 10,
      },
      {
        id: 'wall-2',
        start: { x: 400, z: 0 },
        end: { x: 400, z: 400 },
        height: 250,
        thickness: 10,
      },
      {
        id: 'wall-3',
        start: { x: 400, z: 400 },
        end: { x: 0, z: 400 },
        height: 250,
        thickness: 10,
      },
      {
        id: 'wall-4',
        start: { x: 0, z: 400 },
        end: { x: 0, z: 0 },
        height: 250,
        thickness: 10,
      },
    ],
    objects: [
      {
        id: 'obj-1',
        type: 'chair',
        position: { x: 100, y: 100, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        color: '#8B5CF6',
      },
    ],
    createdAt: new Date().toISOString(),
  },
];
