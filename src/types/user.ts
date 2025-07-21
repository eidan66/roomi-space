import type { Room } from './room';

export type User = {
  id: string;
  email: string;
  password: string;
  isPremium: boolean;
  rooms: Room[];
};
