export type RoomSizeKey = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface RoomSizeConfig {
  key: RoomSizeKey;
  labelKey: string; // i18n key for display
  width: number; // meters
  length: number; // meters
}

export const ROOM_SIZES: RoomSizeConfig[] = [
  { key: 'xs', labelKey: 'roomSize.xs', width: 5, length: 5 },
  { key: 's', labelKey: 'roomSize.s', width: 10, length: 5 },
  { key: 'm', labelKey: 'roomSize.m', width: 12, length: 6 },
  { key: 'l', labelKey: 'roomSize.l', width: 16, length: 8 },
  { key: 'xl', labelKey: 'roomSize.xl', width: 20, length: 10 },
];
