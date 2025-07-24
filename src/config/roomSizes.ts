export const ROOM_SIZES = {
  xs: { width: 5, length: 5, name: '5x5' }, // meters
  s: { width: 10, length: 5, name: '10x5' },
  m: { width: 12, length: 6, name: '12x6' },
  l: { width: 16, length: 8, name: '16x8' },
  xl: { width: 24, length: 12, name: '24x12' },
} as const;

export type RoomSizeKey = keyof typeof ROOM_SIZES;
