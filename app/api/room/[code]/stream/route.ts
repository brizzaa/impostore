import { NextRequest } from "next/server";
import { getRoom } from "@/lib/room";
import { toPublic, Room } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function viewFor(room: Room, playerId: string) {
  const isImpostor = room.impostorIds.includes(playerId);
  const inGame = room.phase !== "lobby";
  return {
    public: toPublic(room),
    you: {
      id: playerId,
      role: inGame ? (isImpostor ? "impostor" : "civilian") : null,
      word: inGame && !isImpostor ? room.word : null,
      category: inGame && isImpostor ? room.category : null,
    },
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const playerId = req.nextUrl.searchParams.get("playerId") ?? "";

  const encoder = new TextEncoder();
  let lastVersion = -1;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tick = async () => {
        const room = await getRoom(code);
        if (!room) {
          send({ type: "gone" });
          return false;
        }
        if (room.version !== lastVersion) {
          lastVersion = room.version;
          send({ type: "state", ...viewFor(room, playerId) });
        }
        return true;
      };

      const ok = await tick();
      if (!ok) {
        closed = true;
        controller.close();
        return;
      }

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const ok = await tick();
          if (!ok) {
            closed = true;
            clearInterval(interval);
            controller.close();
          }
        } catch {
          // ignore transient errors
        }
      }, 1500);

      const stopAt = setTimeout(() => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        send({ type: "reconnect" });
        controller.close();
      }, 50_000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearTimeout(stopAt);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
