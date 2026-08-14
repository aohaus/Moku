const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

// Zero-padded so ascending string order matches ascending numeric order.
// 12 digits covers scores up to 999,999,999,999.
const SCORE_SORT_WIDTH = 12;

function toScoreSort(score) {
  return String(Math.max(0, Math.floor(score))).padStart(SCORE_SORT_WIDTH, "0");
}

module.exports = { doc, TABLE_NAME, toScoreSort };
