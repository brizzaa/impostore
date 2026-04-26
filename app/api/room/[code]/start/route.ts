import { NextRequest, NextResponse } from "next/server";
import { getRoom, saveRoom } from "@/lib/room";
import { startGame } from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { playerId, impostorCount, totalRounds } = await req.json();
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  if (room.hostId !== playerId) return NextResponse.json({ error: "not_host" }, { status: 403 });
  if (room.phase !== "lobby") return NextResponse.json({ error: "already_started" }, { status: 409 });

  if (typeof impostorCount === "number" && impostorCount >= 1 && impostorCount < room.players.length)
    room.impostorCount = impostorCount;
  if (typeof totalRounds === "number" && totalRounds >= 2 && totalRounds <= 10)
    room.totalRounds = totalRounds;

  try {
    startGame(room);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await saveRoom(room);
  return NextResponse.json({ ok: true });
}
