# L'Impostore

Gioco multiplayer dell'impostore. Next.js 16 + Upstash Redis + SSE.

## Setup

1. Crea database Upstash Redis (free tier basta): https://console.upstash.com
2. Copia URL e token in `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
3. `npm run dev` → http://localhost:3000

## Deploy Vercel

1. Push su GitHub.
2. Importa su Vercel.
3. Aggiungi env `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
4. Deploy.

## Come si gioca

- Host crea stanza, condivide il codice 4 cifre.
- Min 3 giocatori. Default 1 impostore, 2 giri.
- Ogni giocatore vede solo la propria parola (l'impostore non riceve nulla).
- A turno ognuno dice una parola correlata. 60s/turno, "passa" disponibile.
- Dopo i giri si vota: maggioranza scopre l'impostore.
- Pareggio = vince l'impostore.

## Architettura

- State condiviso su Upstash Redis (TTL 4h, stateless arcade).
- SSE poll-based 1.5s, riconnessione automatica ogni 50s.
- Word list: 1097 parole italiane comuni (4-12 char) da `napolux/paroleitaliane`.
- No auth, no DB persistente, no storico partite.
