"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicRoom } from "@/lib/types";

type View = {
  public: PublicRoom;
  you: {
    id: string;
    role: "impostor" | "civilian" | null;
    word: string | null;
    category: string | null;
    canGuess: boolean;
  };
};

const ERROR_LABELS: Record<string, string> = {
  word_already_used: "parola già detta!",
  empty_word: "scrivi una parola",
  word_too_long: "parola troppo lunga",
  not_your_turn: "non è il tuo turno",
  empty_guess: "scrivi la parola",
};

const TURN_SECONDS = 60;

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(`impostore:${code}`);
    if (!id) {
      router.replace("/");
      return;
    }
    setPlayerId(id);
  }, [code, router]);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    const open = () => {
      if (cancelled) return;
      const es = new EventSource(`/api/room/${code}/stream?playerId=${playerId}`);
      esRef.current = es;
      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "state") setView({ public: msg.public, you: msg.you });
          else if (msg.type === "gone") setError("Stanza non trovata o scaduta");
          else if (msg.type === "reconnect") {
            es.close();
            setTimeout(open, 200);
          }
        } catch {}
      };
      es.onerror = () => {
        es.close();
        if (!cancelled) setTimeout(open, 1000);
      };
    };
    open();
    return () => {
      cancelled = true;
      esRef.current?.close();
    };
  }, [code, playerId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setRevealed(false);
  }, [view?.public.phase, view?.you.word, view?.you.role]);

  if (error) {
    return (
      <Centered>
        <div className="sticker sticker-cherry shake p-6 max-w-sm">
          <p className="font-bold text-lg">{error}</p>
        </div>
        <button onClick={() => router.replace("/")} className="btn-fun btn-primary mt-5 px-6 py-3 wobble">
          🏠 Home
        </button>
      </Centered>
    );
  }

  if (!view || !playerId) {
    return (
      <Centered>
        <p className="brush text-5xl text-[var(--color-pink)] pulse-bold">caricamento...</p>
      </Centered>
    );
  }

  const r = view.public;
  const isHost = r.hostId === playerId;
  const me = r.players.find((p) => p.id === playerId);
  if (!me) {
    return (
      <Centered>
        <div className="sticker sticker-cherry p-6 max-w-sm">
          <p className="font-bold text-lg">non sei più nella stanza</p>
        </div>
        <button onClick={() => router.replace("/")} className="btn-fun btn-primary mt-5 px-6 py-3 wobble">
          🏠 Home
        </button>
      </Centered>
    );
  }

  if (r.phase === "lobby") return <Lobby r={r} code={code} isHost={isHost} playerId={playerId} />;
  if (r.phase === "playing")
    return (
      <Playing
        r={r}
        code={code}
        playerId={playerId}
        you={view.you}
        revealed={revealed}
        setRevealed={setRevealed}
        now={now}
      />
    );
  if (r.phase === "voting") return <Voting r={r} code={code} playerId={playerId} />;
  if (r.phase === "guessing") return <Guessing r={r} code={code} playerId={playerId} you={view.you} />;
  if (r.phase === "result") return <Result r={r} playerId={playerId} onHome={() => router.replace("/")} />;
  return null;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-paper text-center overflow-hidden">
      <div className="relative-z flex flex-col items-center">{children}</div>
    </main>
  );
}

function Lobby({ r, code, isHost, playerId }: { r: PublicRoom; code: string; isHost: boolean; playerId: string }) {
  const [imp, setImp] = useState(r.impostorCount);
  const [rounds, setRounds] = useState(r.totalRounds);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const start = async () => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/room/${code}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, impostorCount: imp, totalRounds: rounds }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "errore");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const canStart = isHost && r.players.length >= 3 && imp >= 1 && imp < r.players.length;

  return (
    <main className="min-h-screen p-6 bg-paper overflow-hidden">

      <div className="max-w-md mx-auto space-y-5 relative-z">
        <header className="text-center pop-in">
          <p className="brush text-2xl text-[var(--color-pink)] -rotate-2 inline-block">codice stanza</p>
          <button onClick={copyCode} className="sticker sticker-yellow sticker-taped w-full py-6 mt-3 wobble tilt-r">
            <span className="block brush text-7xl font-black tracking-[0.3em] leading-none">
              {copied ? "copiato!" : code}
            </span>
            <span className="block text-xs font-bold opacity-60 mt-2">tap per copiare</span>
          </button>
        </header>

        <div className="sticker sticker-sky p-5 pop-in delay-1 tilt-l">
          <p className="brush text-2xl mb-3">👥 giocatori ({r.players.length})</p>
          <ul className="space-y-2">
            {r.players.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white/70 border-2 border-[var(--color-ink)] rounded-xl px-3 py-2 pop-in"
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                <span className="font-bold">
                  {p.id === playerId ? `${p.name} ` : p.name}
                  {p.id === playerId && <span className="text-xs opacity-60">(tu)</span>}
                </span>
                {p.id === r.hostId && (
                  <span className="bg-[var(--color-yellow)] border-2 border-[var(--color-ink)] text-xs font-black px-2 py-0.5 rounded-lg">
                    👑 host
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isHost ? (
          <div className="sticker sticker-mint p-5 space-y-3 pop-in delay-2 tilt-r">
            <p className="brush text-2xl">⚙️ regola la partita</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-sm font-bold mb-1">😈 Impostori</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, r.players.length - 1)}
                  value={imp}
                  onChange={(e) => setImp(Math.max(1, Number(e.target.value)))}
                  className="input-fun w-full text-center text-lg font-bold"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-bold mb-1">🔄 Giri</span>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={rounds}
                  onChange={(e) => setRounds(Math.max(2, Number(e.target.value)))}
                  className="input-fun w-full text-center text-lg font-bold"
                />
              </label>
            </div>
            <button
              disabled={!canStart || busy}
              onClick={start}
              className="btn-fun btn-primary w-full py-4 text-xl wobble"
            >
              {busy ? "⏳..." : r.players.length < 3 ? "👀 servono 3 giocatori" : "🎬 inizia partita"}
            </button>
            {err && <div className="sticker sticker-cherry shake text-center py-2 px-3 font-bold text-sm">{err}</div>}
          </div>
        ) : (
          <div className="sticker sticker-lilac sticker-taped p-6 text-center pop-in delay-2 tilt-l">
            <p className="brush text-3xl">⏳ in attesa...</p>
            <p className="text-sm font-bold mt-2 opacity-70">l&apos;host sta preparando la partita</p>
          </div>
        )}
      </div>
    </main>
  );
}

function Playing({
  r,
  code,
  playerId,
  you,
  revealed,
  setRevealed,
  now,
}: {
  r: PublicRoom;
  code: string;
  playerId: string;
  you: View["you"];
  revealed: boolean;
  setRevealed: (v: boolean) => void;
  now: number;
}) {
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const current = r.players[r.currentTurnIdx];
  const isMyTurn = current?.id === playerId;
  const elapsed = r.turnStartedAt ? Math.floor((now - r.turnStartedAt) / 1000) : 0;
  const remaining = Math.max(0, TURN_SECONDS - elapsed);

  const submit = async () => {
    if (busy) return;
    if (word.trim().length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/room/${code}/turn`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, word }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErr(ERROR_LABELS[d.error] ?? d.error ?? "errore");
      } else {
        setWord("");
      }
    } finally {
      setBusy(false);
    }
  };

  const timerColor =
    remaining > 30 ? "bg-[var(--color-mint)]" : remaining > 10 ? "bg-[var(--color-yellow)]" : "bg-[var(--color-cherry)]";

  return (
    <main className="min-h-screen p-6 bg-paper overflow-hidden">

      <div className="max-w-md mx-auto space-y-4 relative-z">
        <header className="flex items-center justify-between font-bold pop-in">
          <span className="bg-white border-2 border-[var(--color-ink)] rounded-lg px-3 py-1 text-sm shadow-[2px_2px_0_var(--color-ink)]">
            🏠 {code}
          </span>
          <span className="bg-[var(--color-yellow)] border-2 border-[var(--color-ink)] rounded-lg px-3 py-1 text-sm shadow-[2px_2px_0_var(--color-ink)]">
            🔄 Giro {r.currentRound}/{r.totalRounds}
          </span>
        </header>

        <RoleCard
          role={you.role}
          word={you.word}
          category={you.category}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
        />

        <div className="sticker sticker-sky p-4 pop-in delay-1 tilt-l">
          <p className="text-xs font-bold opacity-70 uppercase tracking-widest">🎤 turno di</p>
          <p className="brush text-4xl mt-1">{isMyTurn ? "tocca a te! 👈" : current?.name ?? "—"}</p>
          <div className="mt-3 h-4 bg-white border-[3px] border-[var(--color-ink)] rounded-full overflow-hidden shadow-[2px_2px_0_var(--color-ink)]">
            <div className={`h-full ${timerColor} transition-all`} style={{ width: `${(remaining / TURN_SECONDS) * 100}%` }} />
          </div>
          <p className="text-sm font-black mt-1">⏱️ {remaining}s</p>
        </div>

        {isMyTurn ? (
          <div className="sticker sticker-yellow sticker-taped p-5 pt-7 space-y-3 pop-in delay-2 tilt-r">
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="dì una parola..."
              autoFocus
              maxLength={40}
              className="input-fun w-full text-center text-xl"
            />
            <button
              onClick={submit}
              disabled={busy || word.trim().length === 0}
              className="btn-fun btn-primary w-full py-3 text-lg"
            >
              ✅ Invia
            </button>
            {err && <div className="sticker sticker-cherry shake text-center py-2 px-3 font-bold text-sm">{err}</div>}
          </div>
        ) : (
          <div className="sticker sticker-lilac p-5 text-center pop-in delay-2 tilt-l">
            <p className="brush text-3xl">⌛ aspetta il tuo turno</p>
          </div>
        )}

        <TurnsList r={r} />
      </div>
    </main>
  );
}

function RoleCard({
  role,
  word,
  category,
  revealed,
  onReveal,
}: {
  role: "impostor" | "civilian" | null;
  word: string | null;
  category: string | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (!role) return null;
  if (!revealed) {
    return (
      <button onClick={onReveal} className="sticker sticker-paper sticker-taped w-full p-7 text-center wobble pop-in tilt-r">
        <p className="text-5xl">🎭</p>
        <p className="brush text-3xl mt-2">tocca per scoprire il ruolo</p>
        <p className="text-xs font-bold opacity-60 mt-1">non far vedere a nessuno!</p>
      </button>
    );
  }
  if (role === "impostor") {
    return (
      <div className="sticker sticker-cherry p-7 text-center pop-in tilt-l space-y-3">
        <p className="text-5xl">😈</p>
        <p className="brush text-3xl">sei l&apos;impostore</p>
        <div className="bg-white/95 text-[var(--color-ink)] border-[3px] border-[var(--color-ink)] rounded-2xl px-4 py-3 shadow-[3px_3px_0_var(--color-ink)]">
          <p className="text-xs font-black uppercase tracking-[0.25em] opacity-70">categoria</p>
          <p className="brush text-4xl mt-1 leading-none">{category}</p>
        </div>
        <p className="font-bold text-sm">bluffa, non farti scoprire</p>
      </div>
    );
  }
  return (
    <div className="sticker sticker-mint p-7 text-center pop-in tilt-r">
      <p className="text-xs font-black uppercase tracking-[0.3em]">📖 la parola è</p>
      <p className="brush text-6xl font-black mt-2 leading-none">{word}</p>
    </div>
  );
}

function TurnsList({ r }: { r: PublicRoom }) {
  if (r.turns.length === 0) return null;
  return (
    <div className="sticker p-4 pop-in delay-3 tilt-l">
      <p className="brush text-2xl mb-2">💬 parole dette</p>
      <ul className="space-y-1">
        {r.turns.map((t, i) => {
          const p = r.players.find((x) => x.id === t.playerId);
          return (
            <li
              key={i}
              className="flex justify-between items-baseline gap-3 border-b-2 border-dashed border-[var(--color-ink)]/20 pb-1"
            >
              <span className="text-sm font-bold opacity-60">{p?.name}</span>
              <span className="brush text-2xl text-right">{t.word}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Voting({ r, code, playerId }: { r: PublicRoom; code: string; playerId: string }) {
  const [busy, setBusy] = useState(false);
  const myVote = r.votes[playerId];
  const vote = async (targetId: string) => {
    if (busy || myVote) return;
    setBusy(true);
    try {
      await fetch(`/api/room/${code}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, targetId }),
      });
    } finally {
      setBusy(false);
    }
  };

  const votedCount = Object.keys(r.votes).length;

  return (
    <main className="min-h-screen p-6 bg-paper overflow-hidden">

      <div className="max-w-md mx-auto space-y-5 relative-z">
        <header className="text-center pop-in">
          <h2 className="text-outline-thick text-6xl font-black -rotate-1">vota!</h2>
          <p className="brush text-2xl mt-2 inline-block bg-[var(--color-pink)] text-white px-4 py-1 border-[3px] border-[var(--color-ink)] rounded-2xl rotate-2 shadow-[3px_3px_0_var(--color-ink)]">
            chi è l&apos;impostore?
          </p>
          <p className="text-sm font-bold mt-3 opacity-70">
            {votedCount}/{r.players.length} hanno votato
          </p>
        </header>

        <ul className="space-y-2.5">
          {r.players.map((p, i) => {
            const isMe = p.id === playerId;
            const selected = myVote === p.id;
            const tilt = i % 2 === 0 ? "tilt-l" : "tilt-r";
            return (
              <li key={p.id} className={`pop-in ${tilt}`} style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
                <button
                  disabled={isMe || busy || !!myVote}
                  onClick={() => vote(p.id)}
                  className={`btn-fun w-full text-left px-5 py-4 ${selected ? "btn-danger" : i % 3 === 0 ? "btn-secondary" : i % 3 === 1 ? "btn-success" : "bg-[var(--color-lilac)]"}`}
                >
                  <span className="brush text-3xl">{p.name}</span>
                  {isMe && <span className="text-xs ml-2 opacity-70 font-bold">(tu)</span>}
                  {selected && <span className="ml-2 font-black">👈 voto!</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <TurnsList r={r} />
      </div>
    </main>
  );
}

function Guessing({
  r,
  code,
  playerId,
  you,
}: {
  r: PublicRoom;
  code: string;
  playerId: string;
  you: View["you"];
}) {
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const guessingPlayer = r.players.find((p) => p.id === r.guessingPlayerId);

  const submit = async () => {
    if (busy || guess.trim().length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/room/${code}/guess`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, guess }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErr(ERROR_LABELS[d.error] ?? d.error ?? "errore");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen p-6 bg-paper overflow-hidden">
      <div className="max-w-md mx-auto space-y-5 relative-z">
        <header className="text-center pop-in">
          <p className="text-5xl">😱</p>
          <h2 className="text-outline-thick text-5xl font-black mt-2 -rotate-1">scoperto!</h2>
          <p className="brush text-2xl mt-2 inline-block bg-[var(--color-pink)] text-white px-4 py-1 border-[3px] border-[var(--color-ink)] rounded-2xl rotate-2 shadow-[3px_3px_0_var(--color-ink)]">
            ultima chance: indovina la parola
          </p>
        </header>

        {you.canGuess ? (
          <div className="sticker sticker-cherry sticker-taped p-5 pt-7 space-y-3 pop-in delay-1 tilt-r">
            <p className="brush text-2xl text-center">tocca a te, impostore</p>
            <p className="text-sm font-bold text-center opacity-90">indovina la parola e ribalta il risultato</p>
            <div className="bg-white/95 text-[var(--color-ink)] border-[3px] border-[var(--color-ink)] rounded-2xl px-3 py-2 shadow-[3px_3px_0_var(--color-ink)] text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] opacity-70">categoria</p>
              <p className="brush text-3xl">{you.category}</p>
            </div>
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="la parola è..."
              autoFocus
              maxLength={40}
              className="input-fun w-full text-center text-2xl"
            />
            <button
              onClick={submit}
              disabled={busy || guess.trim().length === 0}
              className="btn-fun btn-primary w-full py-3 text-lg"
            >
              🎯 indovina
            </button>
            {err && <div className="sticker sticker-yellow shake text-center py-2 px-3 font-bold text-sm">{err}</div>}
          </div>
        ) : (
          <div className="sticker sticker-lilac sticker-taped p-7 text-center pop-in delay-1 tilt-l">
            <p className="brush text-3xl">{guessingPlayer?.name} sta indovinando...</p>
            <p className="text-sm font-bold mt-2 opacity-70">se azzecca la parola, vince l&apos;impostore</p>
          </div>
        )}

        <TurnsList r={r} />
      </div>
    </main>
  );
}

function Result({ r, playerId, onHome }: { r: PublicRoom; playerId: string; onHome: () => void }) {
  if (!r.result) return null;
  const wasImpostor = r.result.impostorIds.includes(playerId);
  const youWon = wasImpostor === r.result.impostorWon;
  const impostorNames = r.players.filter((p) => r.result!.impostorIds.includes(p.id)).map((p) => p.name);
  const votedOut = r.players.find((p) => p.id === r.result!.votedOutId);
  const guess = r.result.impostorGuess;
  const guessCorrect = r.result.impostorGuessCorrect;
  const tally: Record<string, string[]> = {};
  for (const [voter, target] of Object.entries(r.result.votes ?? {})) {
    if (!tally[target]) tally[target] = [];
    const voterName = r.players.find((p) => p.id === voter)?.name ?? "?";
    tally[target].push(voterName);
  }
  const sortedTargets = Object.entries(tally).sort((a, b) => b[1].length - a[1].length);

  return (
    <main className="min-h-screen p-6 bg-paper overflow-hidden">
      <div className="max-w-md mx-auto w-full space-y-4 relative-z py-6">
        <div className={`sticker ${youWon ? "sticker-mint" : "sticker-cherry"} sticker-taped p-8 pt-10 text-center pop-in tilt-r`}>
          <p className="text-7xl">{youWon ? "🏆" : "💀"}</p>
          <p className="brush text-4xl mt-2">{youWon ? "hai vinto!" : "hai perso!"}</p>
          <p className="text-outline text-3xl font-black mt-3 leading-tight">
            {r.result.impostorWon ? "L'impostore vince" : "Il gruppo vince"}
          </p>
        </div>

        <div className="sticker sticker-yellow p-5 space-y-3 pop-in delay-1 tilt-l">
          <p className="brush text-2xl">📖 la parola era</p>
          <div className="text-center bg-white border-[3px] border-[var(--color-ink)] rounded-2xl py-4 shadow-[3px_3px_0_var(--color-ink)]">
            <p className="brush text-5xl leading-none">{r.result.word}</p>
            <p className="text-xs font-black uppercase tracking-[0.25em] opacity-60 mt-2">{r.result.category}</p>
          </div>
        </div>

        <div className="sticker sticker-pink p-5 space-y-2 pop-in delay-2 tilt-r">
          <p className="brush text-2xl text-white">😈 {impostorNames.length > 1 ? "impostori" : "impostore"}</p>
          <ul className="space-y-1">
            {impostorNames.map((n) => (
              <li
                key={n}
                className="bg-white text-[var(--color-ink)] border-[3px] border-[var(--color-ink)] rounded-xl px-3 py-2 brush text-2xl flex items-center justify-between"
              >
                <span>{n}</span>
                {votedOut?.name === n && <span className="text-xs font-black bg-[var(--color-cherry)] text-white px-2 py-0.5 rounded-lg">votato</span>}
              </li>
            ))}
          </ul>
        </div>

        {guess !== null && (
          <div className={`sticker ${guessCorrect ? "sticker-mint" : "sticker-cherry"} p-5 pop-in delay-2 tilt-l`}>
            <p className="brush text-2xl">🎯 ultimo tentativo</p>
            <p className="text-sm font-bold opacity-80">l&apos;impostore ha provato</p>
            <div className="mt-2 bg-white text-[var(--color-ink)] border-[3px] border-[var(--color-ink)] rounded-xl px-3 py-3 text-center shadow-[3px_3px_0_var(--color-ink)]">
              <p className="brush text-4xl">{guess}</p>
              <p className="text-xs font-black uppercase tracking-[0.2em] mt-1">
                {guessCorrect ? "✅ giusto!" : "❌ sbagliato"}
              </p>
            </div>
          </div>
        )}

        <div className="sticker sticker-sky p-5 space-y-3 pop-in delay-3 tilt-r">
          <p className="brush text-2xl">🗳️ voti</p>
          {sortedTargets.length === 0 ? (
            <p className="text-sm font-bold opacity-70">nessuno ha votato</p>
          ) : (
            <ul className="space-y-2">
              {sortedTargets.map(([targetId, voters]) => {
                const target = r.players.find((p) => p.id === targetId);
                const isImpostor = r.result!.impostorIds.includes(targetId);
                return (
                  <li key={targetId} className="bg-white border-[3px] border-[var(--color-ink)] rounded-xl px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="brush text-2xl flex items-center gap-2">
                        {target?.name}
                        {isImpostor && <span className="text-base">😈</span>}
                      </span>
                      <span className="text-xs font-black bg-[var(--color-yellow)] border-2 border-[var(--color-ink)] rounded-lg px-2 py-0.5">
                        {voters.length} {voters.length === 1 ? "voto" : "voti"}
                      </span>
                    </div>
                    <p className="text-xs font-bold opacity-70 mt-1">da: {voters.join(", ")}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="sticker p-4 pop-in delay-3 tilt-l">
          <p className="brush text-2xl mb-2">💬 parole dette</p>
          <ul className="space-y-1">
            {r.turns.map((t, i) => {
              const p = r.players.find((x) => x.id === t.playerId);
              const isImpostor = r.result!.impostorIds.includes(t.playerId);
              return (
                <li key={i} className="flex justify-between items-baseline gap-3 border-b-2 border-dashed border-[var(--color-ink)]/20 pb-1">
                  <span className="text-sm font-bold opacity-60 flex items-center gap-1">
                    {p?.name}
                    {isImpostor && <span>😈</span>}
                  </span>
                  <span className="brush text-2xl text-right">{t.word}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <button onClick={onHome} className="btn-fun btn-primary w-full py-4 text-xl wobble pop-in delay-3">
          🏠 ricomincia
        </button>
      </div>
    </main>
  );
}
