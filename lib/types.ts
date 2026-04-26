export type Phase = "lobby" | "playing" | "voting" | "result";

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Turn {
  playerId: string;
  word: string | null;
  passed: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  word: string | null;
  impostorIds: string[];
  impostorCount: number;
  rounds: number;
  totalRounds: number;
  currentRound: number;
  currentTurnIdx: number;
  turns: Turn[];
  turnStartedAt: number | null;
  votes: Record<string, string>;
  result: {
    impostorIds: string[];
    word: string;
    votedOutId: string | null;
    impostorWon: boolean;
  } | null;
  version: number;
  createdAt: number;
}

export interface PublicRoom {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  impostorCount: number;
  totalRounds: number;
  currentRound: number;
  currentTurnIdx: number;
  turns: Turn[];
  turnStartedAt: number | null;
  votes: Record<string, string>;
  result: Room["result"];
  version: number;
}

export function toPublic(r: Room): PublicRoom {
  return {
    code: r.code,
    hostId: r.hostId,
    phase: r.phase,
    players: r.players,
    impostorCount: r.impostorCount,
    totalRounds: r.totalRounds,
    currentRound: r.currentRound,
    currentTurnIdx: r.currentTurnIdx,
    turns: r.turns,
    turnStartedAt: r.turnStartedAt,
    votes: r.votes,
    result: r.result,
    version: r.version,
  };
}
