"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [impostors, setImpostors] = useState(1);
  const [rounds, setRounds] = useState(2);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/room", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, impostorCount: impostors, totalRounds: rounds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "errore");
      localStorage.setItem(`impostore:${data.code}`, data.playerId);
      router.push(`/room/${data.code}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function join() {
    setErr(null);
    setLoading(true);
    try {
      const c = code.trim();
      const res = await fetch(`/api/room/${c}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "errore");
      localStorage.setItem(`impostore:${c}`, data.playerId);
      router.push(`/room/${c}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const canCreate = name.trim().length > 0 && !loading;
  const canJoin = name.trim().length > 0 && /^\d{4}$/.test(code) && !loading;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper overflow-hidden">
      <span className="confetti confetti-1">🎭</span>
      <span className="confetti confetti-2">🤫</span>
      <span className="confetti confetti-3">🕵️</span>
      <span className="confetti confetti-4">😈</span>
      <span className="confetti confetti-5">⭐</span>
      <span className="confetti confetti-6">💬</span>

      <div className="w-full max-w-sm space-y-6 relative-z">
        <header className="text-center pop-in">
          <p className="brush text-2xl text-[var(--color-pink)] -rotate-3 inline-block">il gioco di</p>
          <h1 className="text-outline-thick text-7xl font-black tracking-tight leading-none mt-1 -rotate-1">
            L&apos;Impostore
          </h1>
          <p className="brush text-3xl mt-3 inline-block bg-[var(--color-yellow)] px-4 py-1 border-[3px] border-[var(--color-ink)] rounded-2xl rotate-2 shadow-[3px_3px_0_var(--color-ink)]">
            chi non sa la parola?
          </p>
        </header>

        <div className="sticker p-1.5 flex gap-1 pop-in delay-1">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-lg transition ${tab === "create" ? "bg-[var(--color-pink)] text-white shadow-[2px_2px_0_var(--color-ink)] border-2 border-[var(--color-ink)]" : "text-[var(--color-ink)]"}`}
          >
            ✨ Crea
          </button>
          <button
            onClick={() => setTab("join")}
            className={`flex-1 py-2.5 rounded-2xl font-bold text-lg transition ${tab === "join" ? "bg-[var(--color-sky)] shadow-[2px_2px_0_var(--color-ink)] border-2 border-[var(--color-ink)]" : "text-[var(--color-ink)]"}`}
          >
            🚪 Entra
          </button>
        </div>

        <div className="sticker sticker-yellow sticker-taped p-5 pt-7 space-y-3 pop-in delay-2 tilt-l">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="il tuo nickname"
            maxLength={24}
            className="input-fun w-full text-center text-xl"
          />

          {tab === "create" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-sm font-bold mb-1">😈 Impostori</span>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    value={impostors}
                    onChange={(e) => setImpostors(Math.max(1, Number(e.target.value)))}
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
                disabled={!canCreate}
                onClick={create}
                className="btn-fun btn-primary w-full py-4 text-xl wobble"
              >
                {loading ? "⏳..." : "🎉 Crea stanza"}
              </button>
            </>
          ) : (
            <>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                inputMode="numeric"
                className="input-fun w-full text-center text-5xl tracking-[0.4em] font-black brush"
              />
              <button
                disabled={!canJoin}
                onClick={join}
                className="btn-fun btn-secondary w-full py-4 text-xl wobble"
              >
                {loading ? "⏳..." : "🚀 Entra in stanza"}
              </button>
            </>
          )}

          {err && (
            <div className="sticker sticker-cherry shake text-center py-2 px-3 font-bold text-sm">{err}</div>
          )}
        </div>

        <p className="text-center text-sm font-bold opacity-60 pop-in delay-3 relative-z">
          min 3 giocatori • 60s a turno • <span className="brush text-base">buona fortuna!</span>
        </p>
      </div>
    </main>
  );
}
