# Dreamlo HTTPS Proxy — デプロイ手順

Dreamloのスコア更新/取得URLは `http://` のみ(HTTPS化は有料)。
GitHub Pages等のHTTPS配信ページから直接呼ぶとMixed Contentでブラウザにブロックされるため、
Lambda 1関数でDreamloへの中継を立て、HTTPSの入口を用意する。

**重要: Dreamloのprivate code(スコア書き込み権限)はこのLambdaの環境変数にのみ保持し、
クライアント(ゲームHTML)には一切渡さない。** ゲームHTMLは誰でもソースを閲覧できる公開ファイルなので、
private codeをクライアント側の設定に渡すとランキングが自由に改ざんされてしまう。
クライアントが送るのは `gameId` とスコアのみで、Dreamlo自体のURL構造・キーは意識しない。

ACMや独自ドメインは使わない。Lambda Function URL(またはAPI Gateway HTTP API)が標準でHTTPSエンドポイントを
無料発行してくれるため、それをそのままクライアントから叩く。

## デプロイ

```sh
cd dreamlo-proxy
sam build
sam deploy --guided
```

`AllowedOrigin` パラメータにゲーム配信元(例: `https://aohaus.github.io`)を指定する。

**`GAME_KEYS` 環境変数(必須)**: `{ "<gameId>": { "public": "<dreamlo public code>", "private": "<dreamlo private code>" }, ... }` という形のJSON文字列。
タイトルを追加するたびに、そのタイトル用のDreamloリーダーボードを作成し、このJSONにエントリを追加する
(Lambdaコンソールなら「設定」→「環境変数」から編集、SAMなら`sam deploy --guided`のパラメータとして渡す)。

デプロイ完了後に出力される `ProxyUrl`(またはAPI GatewayのURL)を、`shared/moku-scores.js` の
`configure({ proxyBaseUrl, gameId })` に渡す。

## API仕様

プロキシ自身が薄いAPIを提供する(Dreamloの生URLはクライアントから直接は触らない)。

### ランキング取得
```
GET {proxyBaseUrl}?gameId=<gameId>&limit=<n>
```
```json
{ "gameId": "angry-moku-battle-royal", "ranking": [
  { "rank": 1, "playerName": "Moku#a1b2c3", "score": 12345, "level": 5, "date": "..." }
] }
```

### スコア送信
```
GET {proxyBaseUrl}?gameId=<gameId>&action=submit&name=<name>&score=<n>&seconds=<n>
```
`seconds`はレベル等の付加情報として流用可(Dreamloの仕様上のフィールド名がそのまま出ているだけ)。
```json
{ "submitted": true }
```

`gameId`が`GAME_KEYS`に登録されていない場合は404、`score`が不正なら400を返す。
`GET`以外のメソッドは405で拒否する。名前(`name`)は20文字を超えると切り詰められる(`MAX_NAME_LEN`)ため、
Dreamlo管理画面から手動で削除する際は、切り詰められた後の実際の名前を指定すること。

## CORSの設定に関する注意(ハマりどころ)

- `ALLOWED_ORIGIN`環境変数は**パスを含めない**(`https://aohaus.github.io`のようにscheme+hostのみ)。
  ブラウザが送る`Origin`ヘッダーは常にパス無しなので、`https://aohaus.github.io/Moku/`のような
  パス付きの値を設定すると絶対に一致せずCORSエラーになる。
- API GatewayでAPIを作成した際、**API側にも「CORS」設定画面が別途存在する**(左メニューの「CORS」)。
  ここで何らかの設定(空でも)が入っていると、API GatewayがLambdaの返すCORSヘッダーを無視して
  上書き/除去してしまう(コンソールにもその旨の警告文が表示される)。このプロジェクトではLambda側の
  `corsHeaders()`だけで完結させる設計のため、**API Gateway側のCORS設定は「Clear」で未設定のままにする**。

## コスト

Lambda Function URL(またはAPI Gateway)は呼び出し課金のみ。数百プレイヤー・スコア確認程度の
アクセス量であればAWS Free Tier内に収まる想定。

## デプロイ済み環境(Angry Moku Battle Royal用)

2026-08-14、AWSコンソールから手動デプロイ済み(リージョン `ap-southeast-5` でLambda Function URLが
未対応だったため、`template.yaml`のFunction URLの代わりにAPI Gateway HTTP APIトリガーを使用)。

- **Proxy base URL**: `https://juqg6nv21k.execute-api.ap-southeast-5.amazonaws.com/default/moku-dreamlo-proxy`
- **`gameId`**: `angry-moku-battle-royal`
- Dreamloのpublic/private codeはLambdaの`GAME_KEYS`環境変数にのみ保持(リポジトリには記載しない)。

2026-08-14、上記の`gameId`ベースAPI(private codeをクライアントに渡さない設計)へのコード更新・
`GAME_KEYS`環境変数の設定も完了・動作確認済み(スコア送信→ランキング取得の実機テストでOKを確認)。
クライアント側は`proxyBaseUrl`と`gameId`のみで利用できる。
