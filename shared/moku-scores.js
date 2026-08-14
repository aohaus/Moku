/**
 * Moku Series — shared leaderboard client (Dreamlo-backed).
 *
 * Usage:
 *   MokuScores.configure({ publicKey: "xxxx", privateKey: "yyyy" });
 *   await MokuScores.submit(gameId, score);
 *   const ranking = await MokuScores.fetchTop(gameId, 20);
 *
 * Design notes (see SPEC.md §6):
 * - No login/account. Players are identified by a per-device UUID stored at
 *   localStorage["moku:deviceId"], shared across all Moku titles.
 * - Opt-in networking only: call submit()/fetchTop() from explicit user
 *   actions (score-confirmed screen, opening the ranking screen) — never on
 *   page load. Never let a failed request block gameplay.
 * - Dreamlo leaderboards are shared across ALL Moku titles under one
 *   public/private key pair. gameId is embedded in the submitted name so a
 *   single leaderboard can be filtered/sorted per game client-side, OR (the
 *   recommended setup) create one separate Dreamlo leaderboard per gameId
 *   and pass its own key pair to configure(). Verify current URL formats on
 *   your Dreamlo dashboard before relying on this in production.
 */
(function (global) {
  const DEVICE_ID_KEY = "moku:deviceId";
  const DREAMLO_BASE = "https://www.dreamlo.com/lb";

  let publicKey = null;
  let privateKey = null;

  function configure({ publicKey: pub, privateKey: priv }) {
    publicKey = pub;
    privateKey = priv;
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  // Encodes gameId + deviceId into the Dreamlo "name" field so a single
  // leaderboard can be filtered per game and de-duplicated per device.
  function entryName(gameId, playerName) {
    const label = (playerName || "Moku").slice(0, 12);
    return `${gameId}:${getDeviceId().slice(0, 8)}:${label}`;
  }

  async function submit(gameId, score, { playerName, level } = {}) {
    if (!privateKey) throw new Error("MokuScores: call configure({ privateKey }) first");
    const name = encodeURIComponent(entryName(gameId, playerName));
    const seconds = level != null ? Math.max(0, Math.floor(level)) : 0;
    const url = `${DREAMLO_BASE}/${privateKey}/add/${name}/${Math.floor(score)}/${seconds}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MokuScores: submit failed (${res.status})`);
    return true;
  }

  async function fetchTop(gameId, limit = 50) {
    if (!publicKey) throw new Error("MokuScores: call configure({ publicKey }) first");
    const res = await fetch(`${DREAMLO_BASE}/${publicKey}/json`);
    if (!res.ok) throw new Error(`MokuScores: fetch failed (${res.status})`);
    const data = await res.json();
    const entries = data?.dreamlo?.leaderboard?.entry || [];
    return entries
      .filter((e) => typeof e.name === "string" && e.name.startsWith(`${gameId}:`))
      .map((e) => {
        const [, deviceIdPrefix, ...rest] = e.name.split(":");
        return {
          deviceIdPrefix,
          playerName: rest.join(":"),
          score: Number(e.score),
          level: Number(e.seconds) || undefined,
          date: e.date,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry, i) => ({ rank: i + 1, ...entry }));
  }

  global.MokuScores = { configure, getDeviceId, submit, fetchTop };
})(window);
