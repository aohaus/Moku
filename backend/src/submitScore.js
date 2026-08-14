const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { doc, TABLE_NAME, toScoreSort } = require("./db");
const { json } = require("./response");

const MAX_PLAYER_NAME_LEN = 24;
const MAX_META_JSON_LEN = 512;

function badRequest(message) {
  return json(400, { error: message });
}

exports.handler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return badRequest("invalid JSON body");
  }

  const { gameId, deviceId, score, playerName, level, meta } = body;

  if (typeof gameId !== "string" || !gameId) return badRequest("gameId is required");
  if (typeof deviceId !== "string" || !deviceId) return badRequest("deviceId is required");
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
    return badRequest("score must be a non-negative number");
  }
  if (playerName !== undefined) {
    if (typeof playerName !== "string" || playerName.length > MAX_PLAYER_NAME_LEN) {
      return badRequest(`playerName must be a string up to ${MAX_PLAYER_NAME_LEN} chars`);
    }
  }
  if (level !== undefined && typeof level !== "number") {
    return badRequest("level must be a number");
  }
  if (meta !== undefined) {
    if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
      return badRequest("meta must be an object");
    }
    if (JSON.stringify(meta).length > MAX_META_JSON_LEN) {
      return badRequest(`meta must serialize to at most ${MAX_META_JSON_LEN} bytes`);
    }
  }

  const now = new Date().toISOString();

  try {
    const result = await doc.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { gameId, deviceId },
        UpdateExpression:
          "SET score = :score, scoreSort = :scoreSort, playerName = :playerName, " +
          "level = :level, meta = :meta, updatedAt = :updatedAt, " +
          "createdAt = if_not_exists(createdAt, :updatedAt)",
        ConditionExpression: "attribute_not_exists(score) OR :score > score",
        ExpressionAttributeValues: {
          ":score": score,
          ":scoreSort": toScoreSort(score),
          ":playerName": playerName ?? null,
          ":level": level ?? null,
          ":meta": meta ?? null,
          ":updatedAt": now,
        },
        ReturnValues: "ALL_NEW",
      })
    );
    return json(200, { updated: true, record: result.Attributes });
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return json(200, { updated: false, reason: "existing score is higher or equal" });
    }
    console.error(err);
    return json(500, { error: "internal error" });
  }
};
