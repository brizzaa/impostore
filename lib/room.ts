import { redis, roomKey, ROOM_TTL_SECONDS } from "./redis";
import { Room } from "./types";

export async function getRoom(code: string): Promise<Room | null> {
  const data = await redis.get<Room>(roomKey(code));
  return data ?? null;
}

export async function saveRoom(room: Room): Promise<void> {
  await redis.set(roomKey(room.code), room, { ex: ROOM_TTL_SECONDS });
}

export async function deleteRoom(c: string): Promise<void> {
  await redis.del(roomKey(c));
}

export async function genUniqueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const c = String(Math.floor(1000 + Math.random() * 9000));
    const exists = await redis.exists(roomKey(c));
    if (!exists) return c;
  }
  throw new Error("no_code_available");
}

export function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function bump(r: Room): Room {
  r.version += 1;
  return r;
}

export const TURN_SECONDS = 60;
