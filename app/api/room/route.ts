import { NextRequest, NextResponse } from "next/server";
import { genId, genUniqueCode, saveRoom } from "@/lib/room";
import { Room } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { name, impostorCount = 1, totalRounds = 2 } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0)
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (typeof impostorCount !== "number" || impostorCount < 1)
    return NextResponse.json({ error: "invalid_impostor_count" }, { status: 400 });
  if (typeof totalRounds !== "number" || totalRounds < 2)
    return NextResponse.json({ error: "invalid_rounds" }, { status: 400 });

  const code = await genUniqueCode();
  const hostId = genId();
  const room: Room = {
    code,
    hostId,
    phase: "lobby",
    players: [{ id: hostId, name: name.trim().slice(0, 24), joinedAt: Date.now() }],
    word: null,
    category: null,
    impostorIds: [],
    impostorCount,
    totalRounds,
    currentRound: 0,
    currentTurnIdx: 0,
    turns: [],
    turnStartedAt: null,
    votes: {},
    result: null,
    version: 1,
    createdAt: Date.now(),
  };
  await saveRoom(room);
  return NextResponse.json({ code, playerId: hostId });
}
