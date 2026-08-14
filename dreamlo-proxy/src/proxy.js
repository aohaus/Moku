const http = require("http");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const UPSTREAM_HOST = "dreamlo.com";

// { "<gameId>": { "public": "<dreamlo public code>", "private": "<dreamlo private code>" }, ... }
// Private codes live ONLY here (server-side env var) — the client never
// sees them, so a public game HTML file can't leak write access to the
// leaderboard.
const GAME_KEYS = JSON.parse(process.env.GAME_KEYS || "{}");

const MAX_NAME_LEN = 20;
const MAX_LIMIT = 25; // Dreamlo free tier only ever keeps the top 25 anyway.

function corsHeaders(extra = {}) {
  return {
    "access-control-allow-origin": ALLOWED_ORIGIN,
    ...extra,
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  };
}

function fetchUpstream(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: UPSTREAM_HOST, path, timeout: 4000 }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          statusCode: res.statusCode || 502,
          body: Buffer.concat(chunks).toString("utf8"),
        })
      );
    });
    req.on("timeout", () => req.destroy(new Error("upstream timeout")));
    req.on("error", reject);
  });
}

function sanitizeName(name) {
  return String(name || "Moku").replace(/\*/g, "").slice(0, MAX_NAME_LEN);
}

async function handleTop(gameId, limitParam) {
  const keys = GAME_KEYS[gameId];
  if (!keys) return json(404, { error: `unknown gameId: ${gameId}` });

  const { statusCode, body } = await fetchUpstream(`/lb/${keys.public}/json`);
  if (statusCode !== 200) return json(502, { error: "upstream error" });

  let limit = parseInt(limitParam, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = MAX_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);

  const data = JSON.parse(body);
  const entries = data?.dreamlo?.leaderboard?.entry;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];

  const ranking = list
    .map((e) => ({
      playerName: String(e.name),
      score: Number(e.score),
      level: Number(e.seconds) || undefined,
      date: e.date,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry, i) => ({ rank: i + 1, ...entry }));

  return json(200, { gameId, ranking });
}

async function handleSubmit(gameId, params) {
  const keys = GAME_KEYS[gameId];
  if (!keys) return json(404, { error: `unknown gameId: ${gameId}` });

  const score = parseInt(params.score, 10);
  if (!Number.isFinite(score) || score < 0) {
    return json(400, { error: "score must be a non-negative integer" });
  }
  const name = encodeURIComponent(sanitizeName(params.name));
  const seconds = Math.max(0, parseInt(params.seconds, 10) || 0);

  const { statusCode } = await fetchUpstream(
    `/lb/${keys.private}/add/${name}/${score}/${seconds}`
  );
  if (statusCode !== 200) return json(502, { error: "upstream error" });

  return json(200, { submitted: true });
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || "GET";
  if (method !== "GET") {
    return json(405, { error: "method not allowed" });
  }

  const params = event.queryStringParameters || {};
  const { gameId, action } = params;
  if (!gameId) return json(400, { error: "gameId is required" });

  try {
    if (action === "submit") return await handleSubmit(gameId, params);
    return await handleTop(gameId, params.limit);
  } catch (err) {
    console.error(err);
    return json(500, { error: "internal error" });
  }
};
