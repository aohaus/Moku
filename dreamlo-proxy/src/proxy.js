const http = require("http");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const UPSTREAM_HOST = "dreamlo.com";

function corsHeaders(extra = {}) {
  return {
    "access-control-allow-origin": ALLOWED_ORIGIN,
    ...extra,
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
          contentType: res.headers["content-type"] || "text/plain",
          body: Buffer.concat(chunks).toString("utf8"),
        })
      );
    });
    req.on("timeout", () => req.destroy(new Error("upstream timeout")));
    req.on("error", reject);
  });
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || "GET";
  if (method !== "GET") {
    return { statusCode: 405, headers: corsHeaders(), body: "method not allowed" };
  }

  const rawPath = event.rawPath || "/";
  // Only ever proxy Dreamlo's own leaderboard path space (/lb/...).
  if (!rawPath.startsWith("/lb/")) {
    return { statusCode: 404, headers: corsHeaders(), body: "not found" };
  }

  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const upstreamPath = rawPath + query;

  try {
    const { statusCode, contentType, body } = await fetchUpstream(upstreamPath);
    return {
      statusCode,
      headers: corsHeaders({ "content-type": contentType }),
      body,
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 502, headers: corsHeaders(), body: "upstream error" };
  }
};
