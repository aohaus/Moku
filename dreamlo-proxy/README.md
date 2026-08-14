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

Lambda Function URLは呼び出し課金のみ。数百プレイヤー・スコア確認程度のアクセス量であれば
AWS Free Tier内に収まる想定。
