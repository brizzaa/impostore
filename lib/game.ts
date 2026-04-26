import { Room, Turn } from "./types";
import { pickWord } from "./words";
import { bump } from "./room";

export function startGame(room: Room): Room {
  if (room.players.length < 3) throw new Error("min_3_players");
  if (room.impostorCount < 1 || room.impostorCount >= room.players.length)
    throw new Error("invalid_impostor_count");

  const pick = pickWord();
  const shuffled = [...room.players].sort(() => Math.random() - 0.5);
  const impostorIds = shuffled.slice(0, room.impostorCount).map((p) => p.id);

  room.word = pick.word;
  room.category = pick.category;
  room.impostorIds = impostorIds;
  room.phase = "playing";
  room.currentRound = 1;
  room.currentTurnIdx = 0;
  room.turns = [];
  room.turnStartedAt = Date.now();
  room.votes = {};
  room.guessingPlayerId = null;
  room.result = null;
  return bump(room);
}

const norm = (s: string) => s.trim().toLowerCase();

export function submitTurn(room: Room, playerId: string, word: string): Room {
  if (room.phase !== "playing") throw new Error("not_playing");
  const current = room.players[room.currentTurnIdx];
  if (!current || current.id !== playerId) throw new Error("not_your_turn");

  const cleaned = norm(word ?? "");
  if (cleaned.length === 0) throw new Error("empty_word");
  if (cleaned.length > 40) throw new Error("word_too_long");
  if (room.turns.some((t) => norm(t.word) === cleaned)) throw new Error("word_already_used");

  const turn: Turn = { playerId, word: cleaned };
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
    transitionAfterVote(room);
  }
  return bump(room);
}

function tallyVotedOut(votes: Record<string, string>): string | null {
  const tally: Record<string, number> = {};
  for (const t of Object.values(votes)) tally[t] = (tally[t] ?? 0) + 1;
  let max = 0;
  let winners: string[] = [];
  for (const [id, n] of Object.entries(tally)) {
    if (n > max) {
      max = n;
      winners = [id];
    } else if (n === max) winners.push(id);
  }
  return winners.length === 1 ? winners[0] : null;
}

function transitionAfterVote(room: Room): void {
  const votedOutId = tallyVotedOut(room.votes);
  const impostorCaught = !!votedOutId && room.impostorIds.includes(votedOutId);

  if (impostorCaught) {
    room.phase = "guessing";
    room.guessingPlayerId = votedOutId;
  } else {
    finalize(room, votedOutId, null, null);
  }
}

export function submitGuess(room: Room, playerId: string, guess: string): Room {
  if (room.phase !== "guessing") throw new Error("not_guessing");
  if (room.guessingPlayerId !== playerId) throw new Error("not_your_guess");

  const cleaned = norm(guess ?? "");
  if (cleaned.length === 0) throw new Error("empty_guess");

  const correct = cleaned === norm(room.word ?? "");
  finalize(room, room.guessingPlayerId, cleaned, correct);
  return bump(room);
}

function finalize(
  room: Room,
  votedOutId: string | null,
  guess: string | null,
  guessCorrect: boolean | null
): void {
  let impostorWon: boolean;
  if (votedOutId === null) {
    impostorWon = true;
  } else if (!room.impostorIds.includes(votedOutId)) {
    impostorWon = true;
  } else {
    impostorWon = guessCorrect === true;
  }

  room.phase = "result";
  room.result = {
    impostorIds: room.impostorIds,
    word: room.word!,
    category: room.category!,
    votedOutId,
    votes: { ...room.votes },
    impostorWon,
    impostorGuess: guess,
    impostorGuessCorrect: guessCorrect,
  };
}
