# Moku Scores API — デプロイ手順(自前ホスト版・将来の代替案)

**現在の実装方針は Dreamlo(外部ホスト型サービス)です。** SPEC.md §6 および `shared/moku-scores.js` を参照。
このディレクトリは、Dreamloで要件を満たせなくなった場合の移行先として残している自前ホスト版(AWS SAM)。

AWS SAM CLI が必要 (`brew install aws-sam-cli` 等)。AWSアカウント/認証情報は設定済みであること。

```sh
cd backend
sam build
sam deploy --guided
```

`--guided` の初回実行で `samconfig.toml` が生成される(次回以降は `sam deploy` のみでよい)。
`AllowedOrigin` パラメータに、ゲームを配信するオリジン(例: `https://aohaus.github.io`)を指定する。

デプロイ完了後、出力される `ApiUrl` をクライアント側の設定に使う。

## ローカルでの動作確認

```sh
sam local start-api
```

## 構成

- `template.yaml` — API Gateway (HTTP API) + Lambda + DynamoDB (`moku-scores` テーブル) を定義。
- `src/submitScore.js` — `POST /scores` ハンドラ。自己ベストのみ保持。
- `src/getScores.js` — `GET /scores` ハンドラ。ランキング取得 / 自分の記録取得。
- `src/db.js` — DynamoDB Document Client、`scoreSort`(降順ソート用ゼロ埋め文字列)の生成。

詳細な仕様は [`API_SPEC.md`](./API_SPEC.md) を参照。

## コスト

DynamoDBは PAY_PER_REQUEST、Lambda/API Gatewayともに従量課金。
数百プレイヤー規模のアクセス量であれば AWS Free Tier の範囲内に収まる想定。
