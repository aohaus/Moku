const { GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { doc, TABLE_NAME } = require("./db");
const { json } = require("./response");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const { gameId, deviceId } = params;

  if (typeof gameId !== "string" || !gameId) {
    return json(400, { error: "gameId is required" });
  }

  if (deviceId) {
    const result = await doc.send(
      new GetCommand({ TableName: TABLE_NAME, Key: { gameId, deviceId } })
    );
    return json(200, { record: result.Item ?? null });
  }

  let limit = parseInt(params.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);

  const result = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "gameId-scoreSort-index",
      KeyConditionExpression: "gameId = :gameId",
      ExpressionAttributeValues: { ":gameId": gameId },
      ScanIndexForward: false, // highest scoreSort first
      Limit: limit,
    })
  );

  const ranking = (result.Items || []).map((item, index) => ({
    rank: index + 1,
    deviceId: item.deviceId,
    playerName: item.playerName,
    score: item.score,
    level: item.level,
    updatedAt: item.updatedAt,
  }));

  return json(200, { gameId, ranking });
};
