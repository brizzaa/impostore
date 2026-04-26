import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const ROOM_TTL_SECONDS = 60 * 60 * 4;

export const roomKey = (code: string) => `impostore:room:${code}`;
