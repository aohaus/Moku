/**
 * Moku Series — shared leaderboard client (Dreamlo-backed, via HTTPS proxy).
 *
 * Usage:
 *   MokuScores.configure({
 *     proxyBaseUrl: "https://xxxx.lambda-url.ap-northeast-1.on.aws",
 *     publicKey: "6a7ee0c48f40bb13505af5d3",
 *     privateKey: "lIpLNsMEyEmASwwcr_mWzwSqyPD5KmuUCwaBIaB3PszA",
 *   });
 *   await MokuScores.submit(score, { playerName: "Moku", level: 5 });
 *   const ranking = await MokuScores.fetchTop(20);
 *
 * Design notes (see SPEC.md §6):
 * - No login/account. Players are identified by a per-device UUID stored at
 *   localStorage["moku:deviceId"], shared across all Moku titles.
 * - Opt-in networking only: call submit()/fetchTop() from explicit user
 *   actions (score-confirmed screen, opening the ranking screen) — never on
 *   page load. Never let a failed request block gameplay.
 * - Create ONE separate Dreamlo leaderboard per gameId (own public/private
 *   key pair) at https://www.dreamlo.com/ — do not share one leaderboard
 *   across titles. Dreamlo free tier keeps only the top 25 scores per
 *   leaderboard and auto-dedupes by name (resubmitting a lower score is a
 *   no-op), which is exactly what a top-ranking display wants.
 * - Dreamlo's own URLs are HTTP-only (HTTPS requires a paid donation), so a
 *   thin Lambda proxy (see dreamlo-proxy/) mirrors Dreamlo's /lb/... path
 *   space over HTTPS to avoid mixed-content blocking on HTTPS-served game
 *   pages (e.g. GitHub Pages). `proxyBaseUrl` must point at that proxy.
 * - Names may not contain "*". Keep names short; Dreamlo has no documented
 *   hard limit but long names make the ranking display noisy.
 */
(function (global) {
  const DEVICE_ID_KEY = "moku:deviceId";

  let proxyBaseUrl = null;
  let publicKey = null;
  let privateKey = null;

  function configure({ proxyBaseUrl: base, publicKey: pub, privateKey: priv }) {
    proxyBaseUrl = base ? base.replace(/\/$/, "") : proxyBaseUrl;
    publicKey = pub ?? publicKey;
    privateKey = priv ?? privateKey;
  }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  // Dreamlo de-dupes by exact name match, keeping the higher score. Suffix
  // the display name with a short device id so two players who pick the
  // same nickname don't clobber each other's scores.
  function entryName(playerName) {
    const label = (playerName || "Moku").replace(/\*/g, "").slice(0, 12);
    const suffix = getDeviceId().slice(0, 6);
    return `${label}#${suffix}`;
  }

  async function submit(score, { playerName, level } = {}) {
    if (!proxyBaseUrl) throw new Error("MokuScores: call configure({ proxyBaseUrl }) first");
    if (!privateKey) throw new Error("MokuScores: call configure({ privateKey }) first");
    const name = encodeURIComponent(entryName(playerName));
    const seconds = level != null ? Math.max(0, Math.floor(level)) : 0;
    const url = `${proxyBaseUrl}/lb/${privateKey}/add/${name}/${Math.floor(score)}/${seconds}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`MokuScores: submit failed (${res.status})`);
    return true;
  }

  async function fetchTop(limit = 25) {
    if (!proxyBaseUrl) throw new Error("MokuScores: call configure({ proxyBaseUrl }) first");
    if (!publicKey) throw new Error("MokuScores: call configure({ publicKey }) first");
    const res = await fetch(`${proxyBaseUrl}/lb/${publicKey}/json`);
    if (!res.ok) throw new Error(`MokuScores: fetch failed (${res.status})`);
    const data = await res.json();
    const entries = data?.dreamlo?.leaderboard?.entry || [];
    return entries
      .map((e) => {
        const [label, deviceIdSuffix] = String(e.name).split("#");
        return {
          playerName: label,
          deviceIdSuffix,
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
