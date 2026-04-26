import { NextRequest, NextResponse } from "next/server";
import { getRoom, saveRoom } from "@/lib/room";
import { submitTurn } from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { playerId, word } = await req.json();
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  try {
    submitTurn(room, playerId, word ?? "");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  await saveRoom(room);
  return NextResponse.json({ ok: true });
}
