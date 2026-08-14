# Moku Series — Game Records API 仕様

Mokuシリーズ各タイトル共通の、軽量なゲーム記録集約API。
API Gateway (HTTP API) + Lambda + DynamoDB (`backend/template.yaml`)。

## 設計方針

- **ログイン/アカウント不要**。プレイヤーはデバイスごとのUUID(`deviceId`)で識別する。
- **常時通信しない**。SPEC.md §1 の「外部通信なしでも起動できることを基本とする」方針に従い、
  ゲーム側は以下のタイミングのみ通信する:
  - スコア確定時に `POST /scores` でベストスコアを送信(明示的な操作、またはプレイ終了時の自動送信のいずれでも可。ゲームごとに選択)
  - ランキング画面を開いた時のみ `GET /scores` を呼ぶ
- 通信できない/失敗しても、ローカルの `localStorage` 記録(SPEC.md §2)がプレイの正とする。API送信はあくまで「共有ランキングへの反映」であり、ゲーム進行に必須の依存にしない。
- **保持するのは自己ベストのみ**(`gameId` + `deviceId` ごとに1レコード)。より高いスコアが送られた時だけ更新する。

## deviceId の発行(クライアント側規約)

各ゲームは初回起動時に `localStorage` の `moku:deviceId` を確認し、無ければ `crypto.randomUUID()` で生成して保存する。
このキーは全ゲーム共通(ゲームIDのnamespaceを付けない)にし、同一デバイスであれば全タイトルで同じ`deviceId`を使う。

```js
function getMokuDeviceId() {
  const KEY = "moku:deviceId";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
```

## エンドポイント

Base URL はデプロイ後に `sam deploy` の出力(`ApiUrl`)で決まる。

### `POST /scores`

スコアを送信する。既存の自己ベストより高い場合のみ更新される。

**Request body**
```json
{
  "gameId": "angry-moku-battle-royal",
  "deviceId": "5f2c...-uuid",
  "score": 12345,
  "playerName": "Moku",
  "level": 5,
  "meta": { "mode": "battle-royal" }
}
```
- `gameId` (string, required) — `kebab-case`、SPEC.mdのファイル名(拡張子なし)と一致させる。
- `deviceId` (string, required) — 上記の共通デバイスID。
- `score` (number, required) — 0以上。
- `playerName` (string, optional, ≤24文字) — 省略可。ランキング表示用の任意ニックネーム。
- `level` (number, optional) — ゲームによって「到達レベル」等をスコアと併せて表示したい場合。
- `meta` (object, optional, JSON化して512バイト以内) — ゲーム固有の付加情報。ランキング一覧には含まれない(将来の詳細表示用)。

**Response 200**
```json
{ "updated": true, "record": { "gameId": "...", "deviceId": "...", "score": 12345, "...": "..." } }
```
更新されなかった場合(既存の方が高い/同じ):
```json
{ "updated": false, "reason": "existing score is higher or equal" }
```

**Response 400** — バリデーションエラー時 `{ "error": "message" }`

### `GET /scores?gameId=<gameId>&limit=<n>`

指定ゲームのランキング上位を取得する(降順、デフォルト50件、最大100件)。

**Response 200**
```json
{
  "gameId": "angry-moku-battle-royal",
  "ranking": [
    { "rank": 1, "deviceId": "...", "playerName": "Moku", "score": 99999, "level": 9, "updatedAt": "2026-08-14T00:00:00Z" }
  ]
}
```

### `GET /scores?gameId=<gameId>&deviceId=<deviceId>`

自分の記録のみを取得する(ランキング内の自分の順位計算は行わない — 必要になれば将来追加)。

**Response 200**
```json
{ "record": { "gameId": "...", "deviceId": "...", "score": 12345, "...": "..." } }
```
記録が無ければ `{ "record": null }`。

## 認証

なし。デバイスIDは自己申告のため、なりすまし・不正送信への耐性は持たない。
数百人規模のカジュアル用途と割り切り、将来的に問題が出た場合は API Gateway の
レート制限強化や reCAPTCHA 的な仕組みの追加を検討する(現時点ではスコープ外)。

## CORS

`template.yaml` の `AllowedOrigin` パラメータで許可オリジンを指定する
(GitHub Pages等の配布先URL)。開発中は `*` のままでよい。
