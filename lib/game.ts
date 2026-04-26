import { Room, Turn } from "./types";
import { pickWord } from "./words";
import { bump } from "./room";

export function startGame(room: Room): Room {
  if (room.players.length < 3) throw new Error("min_3_players");
  if (room.impostorCount < 1 || room.impostorCount >= room.players.length)
    throw new Error("invalid_impostor_count");

  const word = pickWord();
  const shuffled = [...room.players].sort(() => Math.random() - 0.5);
  const impostorIds = shuffled.slice(0, room.impostorCount).map((p) => p.id);

  room.word = word;
  room.impostorIds = impostorIds;
  room.phase = "playing";
  room.currentRound = 1;
  room.currentTurnIdx = 0;
  room.turns = [];
  room.turnStartedAt = Date.now();
  room.votes = {};
  room.result = null;
  return bump(room);
}

export function submitTurn(room: Room, playerId: string, word: string | null, passed: boolean): Room {
  if (room.phase !== "playing") throw new Error("not_playing");
  const current = room.players[room.currentTurnIdx];
  if (!current || current.id !== playerId) throw new Error("not_your_turn");

  const turn: Turn = { playerId, word: passed ? null : (word ?? "").trim().toLowerCase(), passed };
  if (!passed && (!turn.word || turn.word.length === 0)) throw new Error("empty_word");
  room.turns.push(turn);

  const nextIdx = room.currentTurnIdx + 1;
  if (nextIdx >= room.players.length) {
    if (room.currentRound >= room.totalRounds) {
      room.phase = "voting";
      room.turnStartedAt = null;
    } else {
      room.currentRound += 1;
      room.currentTurnIdx = 0;
      room.turnStartedAt = Date.now();
    }
  } else {
    room.currentTurnIdx = nextIdx;
    room.turnStartedAt = Date.now();
  }
  return bump(room);
}

export function castVote(room: Room, voterId: string, targetId: string): Room {
  if (room.phase !== "voting") throw new Error("not_voting");
  if (!room.players.some((p) => p.id === voterId)) throw new Error("not_in_room");
  if (!room.players.some((p) => p.id === targetId)) throw new Error("invalid_target");
  room.votes[voterId] = targetId;
  if (Object.keys(room.votes).length >= room.players.length) {
    finalize(room);
  }
  return bump(room);
}

function finalize(room: Room): void {
  const tally: Record<string, number> = {};
  for (const t of Object.values(room.votes)) tally[t] = (tally[t] ?? 0) + 1;
  let max = 0;
  let winners: string[] = [];
  for (const [id, n] of Object.entries(tally)) {
    if (n > max) {
      max = n;
      winners = [id];
    } else if (n === max) winners.push(id);
  }
  const votedOutId = winners.length === 1 ? winners[0] : null;
  const impostorWon = votedOutId === null || !room.impostorIds.includes(votedOutId);
  room.phase = "result";
  room.result = {
    impostorIds: room.impostorIds,
    word: room.word!,
    votedOutId,
    impostorWon,
  };
}
