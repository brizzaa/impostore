import { NextRequest, NextResponse } from "next/server";
import { genId, getRoom, saveRoom, bump } from "@/lib/room";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0)
    return NextResponse.json({ error: "missing_name" }, { status: 400 });

  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  if (room.phase !== "lobby") return NextResponse.json({ error: "game_in_progress" }, { status: 409 });
  if (room.players.length >= 12) return NextResponse.json({ error: "room_full" }, { status: 409 });

  const trimmed = name.trim().slice(0, 24);
  if (room.players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()))
    return NextResponse.json({ error: "name_taken" }, { status: 409 });

  const id = genId();
  room.players.push({ id, name: trimmed, joinedAt: Date.now() });
  bump(room);
  await saveRoom(room);
  return NextResponse.json({ playerId: id });
}
