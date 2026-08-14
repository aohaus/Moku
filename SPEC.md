# Moku Series 共通仕様

Mokuシリーズはポータル(`index.html`)から各ミニゲーム(単一HTMLファイル)へ遷移する構成。
9タイトル予定、現在5タイトル稼働中(Angry Mokumoku / Moyomoyo / MK Mobile / Angry Moku Battle Royal / Shiri of Moku)。
Mokuball は実装済みだがハブ未公開(準備中)。

## 1. ゲーム間の技術構成

- **フレームワーク不使用、単一HTMLファイル完結**を基本とする(現行3タイトルの構成に合わせる)。
  - 1ゲーム = 1つの `.html`(HTML + CSS + JS 全部インライン)。ビルド工程なし、そのまま静的ホスティング可能。
  - ライブラリを使う場合はCDN経由のみ許可(バンドラー導入はしない)。
- **描画方式**: Canvas 2D を基本とする。ジャンル上どうしても必要な場合のみDOM/CSSアニメーションを併用可(現行ポータルのカードUIのように)。
- **ファイル命名**: `kebab-case.html`(例: `angry-mokumoku.html`)。ポータルの `<a href>` と一致させる。
- **ディレクトリ構成(案)**:
  ```
  /index.html              ポータル
  /angry-mokumoku.html
  /moyomoyo.html
  /mk-mobile.html
  /shared/
    moku-ui.css             共通デザイントークン・カードコンポーネント
    moku-save.js             共通セーブデータAPI
  ```
- **対応環境**: モバイルブラウザ優先(viewport-fit=cover 設定済み)。タッチ操作を第一級とし、マウス/キーボードは補助。
- **オフライン/配布**: 外部通信なしでも起動できることを基本とする(広告SDK等を導入する場合はゲーム側で明示的にopt-in)。

## 2. セーブデータ / 進捗管理

- **保存先**: `localStorage`(サーバー同期は現時点では行わない、将来拡張の余地は残す)。
- **キー名前空間**: `moku:<gameId>:<key>` 形式で統一し、ゲーム間の衝突を防ぐ。
  - 例: `moku:angry-mokumoku:progress`, `moku:moyomoyo:highscore`
- **共通スキーマ(ゲームごとのセーブデータJSON)**:
  ```json
  {
    "version": 1,
    "gameId": "angry-mokumoku",
    "unlockedStage": 5,
    "highScore": 12300,
    "stageStars": { "1": 3, "2": 2 },
    "updatedAt": "2026-08-10T00:00:00Z"
  }
  ```
  - `version` はマイグレーション用。フィールドはゲームジャンルにより増減可だが、`version` / `gameId` / `updatedAt` は必須。
- **ポータル側の進捗表示**: 将来的に各ゲームの `highScore` 等をポータルのカードに表示する場合、`shared/moku-save.js` が全ゲームのキーを横断的に読み取れるようにする。
- **共通ヘルパーAPI(案: `shared/moku-save.js`)**:
  ```js
  MokuSave.load(gameId, defaults)
  MokuSave.save(gameId, data)
  MokuSave.reset(gameId)
  ```

## 3. 共通UI / デザインシステム

ポータル(`index.html`)のトーンを全ゲーム共通のベースとする。

- **カラー**
  - 背景: ダークネイビー系グラデーション `#0A0B12 → #121320 → #0A0B12`
  - テキスト: `#EDEEF6`
  - ゲームごとのアクセントカラー(`--hi` / `--lo`)を1色ペア割り当てる
    - Angry Mokumoku: `#4CBE55` / `#1A5020`(緑)
    - Moyomoyo: `#E98FC7` / `#7A3D63`(ピンク)
    - MK Mobile: `#FFC94A` / `#8A6218`(黄)
    - Angry Moku Battle Royal: `#6E7BFF` / `#2B2F80`(藍)
    - Shiri of Moku: `#FF6B4A` / `#7A2E1A`(朱)
    - Mokuball: `#B98CFF` / `#4B2E7A`(紫)
    - 追加タイトルは新規ペアを定義(既存と被らない色相を選ぶ)
- **タイポグラフィ**: `-apple-system, "Segoe UI", Roboto, sans-serif`。見出しは `font-weight: 800`、字間 `0.01〜0.04em`。
- **共通コンポーネント**
  - カード(`.card`): 角丸16px、2pxボーダー(アクセントカラー)、内側に1pxの縁取り、hoverで浮き上がる。
  - ロック中カード(`.card.soon`): 破線ボーダー、低コントラスト、非活性。
  - フッター: 区切り線 + タグライン + `repo-note`。
- **共通レイアウト規約**
  - `max-width: 900px` 中央寄せ、`clamp()` によるレスポンシブ余白/フォントサイズ。
  - 各ゲーム画面にも「ポータルへ戻る」導線を統一デザインで設置する(未実装 — 要検討)。
- **実装方針**: 上記トークン・コンポーネントを `shared/moku-ui.css` に切り出し、各ゲームHTMLで `<link>` または `<style>@import` して再利用する。
- **言語**: `index.html`(ハブ画面)の表示文言は、特段の指定がない限り英語ベースとする(2026-08-10〜)。各ゲーム本編(`angry-mokumoku.html` 等)は従来通り日本語UIのままでよい — SPEC.md §09チェックリストの「言語は日本語UIで統一」はゲーム本編のみに適用し、ハブ画面には適用しない。

## 4. 「ポータルへ戻る」導線 / タイトル画面の共通フレーム

**この章は実装済みパターンに合わせて更新済み(2026-08-11)。** 当初案の丸ボタン(`.moku-back`)は採用されず、実際には全タイトルが以下の3点セット(HTML固定要素、canvas描画ではない)をタイトル画面にのみ表示する方式に収束している。

- **`#title-frame`**: 画面全体を囲む二重線枠。`position: fixed; inset: 14px;` の外枠(3px, `var(--hi)`)+ `::after` による内枠(inset 5px, 1px, `var(--lo)`)。角丸10px/8px。全タイトル共通・固定値、変更しない。
- **`#hub-link`**: 右上に固定配置する `<a href="index.html">🦉 Mokuシリーズ ▶</a>`。ゲームごとの `--hi` を文字色に使い、2.2sの緩いパルスアニメーションを掛ける。
- **`#buildInfo`**: 左下に固定配置するバージョン表記。詳細は5章。
- **表示タイミング**: 3要素とも「タイトル画面でのみ表示」。`body.on-title` のようなクラス、または各ゲームの画面遷移関数内で `style.display` を直接切り替える方式のいずれでもよい。プレイ中は必ず非表示にする。
- **実装例**: `angry-mokumoku.html` / `shiri-of-moku.html` / `mokuball.html` を参照。
- **横向き専用タイトルの場合**: `angry-mokumoku.html` と `mokuball.html` はゲーム内容上、横持ち固定(landscape-only)。`@media (max-width: 900px) and (orientation: portrait)` 相当の条件で `#rotate-hint`(回転を促す全画面オーバーレイ)を表示し、同条件で `#title-frame` / `#hub-link` / `#buildInfo` / ゲーム本体を非表示にするパターンを両タイトルで踏襲している。縦持ち基本のタイトルではこの節は不要。

## 5. バージョン / 最終更新日時の表示

各ゲームのタイトル画面左下に、目立たないバージョン表記を英語で置く。

- **表示**: `v<version> · Updated <Mon D, YYYY>`(例: `v1.0.0 · Updated Aug 10, 2026`)。日付は英語表記(`Aug 10, 2026`)固定、和暦・スラッシュ区切りは使わない。
- **配置**: 画面左下 `position: fixed`、`env(safe-area-inset-*)` 考慮。`#hub-link`(右上)と対になる位置。
- **見た目**: `color: rgba(255,255,255,0.28)` 程度の低コントラスト、`font-size: 10.5px` 前後。ゲームのアクセントカラーは使わず、常にニュートラルな白の低透明度にする(視認性より控えめさ優先)。
- **表示タイミング**: `#hub-link` / `#title-frame` と同じタイミングでのみ表示(タイトル画面のみ。プレイ中は非表示)。
- **id**: `#buildInfo` で統一。
- **バージョンの更新**: そのゲームに実質的な変更を加えたセッションが、`v<major>.<minor>.<patch>` を適宜インクリメントし、日付を更新する。運用ルールの詳細(何が minor/patch にあたるか等)は今のところ決めておらず、各セッションの裁量に委ねる。

## 6. ゲーム記録集約API(共通ランキング基盤)

Mokuシリーズ全体で使う軽量な共有バックエンド。§1の「外部通信なしでも起動できることを基本とする」方針を維持したまま、
各タイトルが任意でランキング機能を追加できるようにするための共通規約。

- **現在の実装方針: Dreamlo(外部ホスト型リーダーボードサービス) + HTTPSプロキシ**
  - 自前インフラほぼ不要、キー発行のみで使える無料サービス。開発工数を抑えるため採用。
  - タイトルごとに**別々のDreamloリーダーボード**(別々のpublic/private keyペア)を作成する。1リーダーボード共有にしない(下記の理由による)。
  - Dreamloの無料枠は**1リーダーボードにつき上位25件まで**保持(それ以降は最下位が押し出される)。同名で再送すると高い方のスコアだけが残る(自己ベスト管理は不要、Dreamlo側で自動)。ランキング表示用途としてはこの挙動で十分。
  - **⚠️ DreamloのURLは`http://`のみ**(HTTPS化は有料寄付が必要)。GitHub Pages等HTTPS配信のゲームから直接叩くとMixed Contentでブラウザにブロックされるため、`dreamlo-proxy/`(Lambda 1関数、HTTPS入口はFunction URLまたはAPI Gateway)経由で使う。ACMや独自ドメインは使わない。
  - **private codeはクライアントに渡さない**。ゲームHTMLは誰でもソースを閲覧できる公開ファイルのため、Dreamloの書き込み用private codeをクライアント設定に含めるとランキングを自由に改ざんされる。`dreamlo-proxy`が`gameId → {public, private}`のマッピングをLambdaの環境変数(`GAME_KEYS`)として保持し、クライアントは`gameId`とスコアのみを送る(Dreamlo自体のURLやキーは一切意識しない)。仕様・デプロイ手順・**デプロイ済みのProxy base URL**は [`dreamlo-proxy/README.md`](dreamlo-proxy/README.md) を参照。
  - クライアント側ヘルパー: [`shared/moku-scores.js`](shared/moku-scores.js)(`MokuScores.configure({ proxyBaseUrl, gameId })` / `submit` / `fetchTop`)。
  - 外部サービス依存のため、可用性・改ざん耐性はコントロール外。数百人規模のカジュアル用途と割り切る。
- **将来の代替/拡張案: 自前ホスト(API Gateway + Lambda + DynamoDB)**
  - 実装済みテンプレートが `backend/`(AWS SAM)にある。仕様は [`backend/API_SPEC.md`](backend/API_SPEC.md) / デプロイ手順は [`backend/README.md`](backend/README.md)。
  - Dreamloで要件を満たせなくなった場合(25件超の保持、改ざん対策、独自ロジック等)の移行先として保持。
- **通信タイミング(opt-in、Dreamlo/自前どちらの実装でも共通)**: 常時通信はしない。ゲーム側が明示的に呼ぶのは以下のみ。
  - スコア確定時にベストスコアを送信
  - ランキング画面を開いた時のみ取得を呼ぶ
  - 通信失敗時もローカルの `localStorage` 記録(§2)を正とし、プレイ継続に影響させない。
- **認証**: なし。デバイスごとのUUIDを`localStorage`の`moku:deviceId`(全ゲーム共通、ゲームIDのnamespaceを付けない)に保存し、プレイヤーキーとして使う。ログイン・アカウント機能は導入しない。
- **`gameId`**: ファイル名(拡張子なし、`kebab-case`)と一致させる。例: `angry-moku-battle-royal`。Dreamloのリーダーボード名にもこれを使う。
- **新規タイトルがランキングを実装する場合**: そのタイトル専用のDreamloリーダーボードを作成し、`dreamlo-proxy`の`GAME_KEYS`環境変数にそのタイトルの`gameId`とpublic/private keyを追加する(要AWSコンソール/デプロイ操作)。クライアント側は`shared/moku-scores.js`を`<script>`で読み込み、`MokuScores.configure({ proxyBaseUrl, gameId })`を呼ぶだけでよく、Dreamloのキーには一切触れない。

## 未決事項 / 次に決めること

- [ ] `shared/moku-ui.css`・`shared/moku-save.js` の実ファイルを作成するか
- [x] 各ゲーム画面への「ポータルへ戻る」ボタンのデザイン(上記4章で決定)
- [ ] 広告/課金など収益化まわりの共通化(引き続き対象外)。ランキングAPIは§6で仕様策定済み、実デプロイ・各ゲームへのクライアント実装は今後のセッションで対応
- [ ] 残り6タイトルのアクセントカラー割り当てルール

## 開発履歴について

各ゲームファイルの開発履歴は `aohaus/Dev` から `git merge --allow-unrelated-histories -s ours` で本リポジトリに統合済み。
ワークツリーの内容は変わらないが、コミットログは残っている。ただし**通常の `git log -- <file>` は merge simplification により古い履歴が省略される**ため、
過去の開発経緯を追うときは必ず `--full-history` を付けること。

```sh
git log --full-history --oneline -- moyomoyo.html
```
