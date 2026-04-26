import { NextRequest, NextResponse } from "next/server";
import { getRoom, saveRoom } from "@/lib/room";
import { castVote } from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { playerId, targetId } = await req.json();
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  try {
    castVote(room, playerId, targetId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await saveRoom(room);
  return NextResponse.json({ ok: true });
}
