# Dreamlo HTTPS Proxy — デプロイ手順

Dreamloのスコア更新/取得URLは `http://` のみ(HTTPS化は有料)。
GitHub Pages等のHTTPS配信ページから直接呼ぶとMixed Contentでブラウザにブロックされるため、
Lambda 1関数でDreamloへの透過プロキシを立て、HTTPSの入口を用意する。

ACMや独自ドメインは使わない。Lambda Function URLがデフォルトで
`https://<random>.lambda-url.<region>.on.aws/` というHTTPSエンドポイントを無料で発行してくれるため、
それをそのままクライアントから叩く。

## デプロイ

```sh
cd dreamlo-proxy
sam build
sam deploy --guided
```

`AllowedOrigin` パラメータにゲーム配信元(例: `https://aohaus.github.io`)を指定する。

デプロイ完了後に出力される `ProxyUrl` を、`shared/moku-scores.js` の `configure({ proxyBaseUrl })` に渡す。

## 使い方

プロキシはDreamlo自身のURL構造をそのまま踏襲する。ホスト部分だけ置き換えればよい。

```
Dreamlo本来:  http://dreamlo.com/lb/{publicCode}/json
プロキシ経由: https://<ProxyUrl>/lb/{publicCode}/json
```

`add` / `delete` / `clear` など、`/lb/...` から始まるDreamloのURLはすべて同様に使える。
`/lb/` 以外のパスや `GET` 以外のメソッドは404/405で拒否する(オープンプロキシ化の防止)。

## コスト

Lambda Function URL(またはAPI Gateway)は呼び出し課金のみ。数百プレイヤー・スコア確認程度の
アクセス量であればAWS Free Tier内に収まる想定。

## デプロイ済み環境(Angry Moku Battle Royal用)

2026-08-14、AWSコンソールから手動デプロイ済み(リージョン `ap-southeast-5` でLambda Function URLが
未対応だったため、`template.yaml`のFunction URLの代わりにAPI Gateway HTTP APIトリガーを使用)。

- **Proxy base URL**: `https://juqg6nv21k.execute-api.ap-southeast-5.amazonaws.com/default/moku-dreamlo-proxy`
- **Dreamlo public code**(スコア取得用、非機密): `6a7ee0c48f40bb13505af5d3`
- **Dreamlo private code**(スコア送信用、機密情報): リポジトリには記載しない。クライアント実装セッションで別途共有すること。

コンソールでAPI Gatewayを使う場合、`event.rawPath` にステージ/リソースパスの接頭辞が付くため、
`src/proxy.js` は `/lb/` という文字列をパス中のどこにあっても検出して転送する実装になっている
(`rawPath.indexOf("/lb/")`)。SAMの`template.yaml`(Function URL版)を使う場合はこの接頭辞は付かないが、
同じロジックで問題なく動作する。
