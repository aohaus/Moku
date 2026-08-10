# Moku Series 共通仕様

Mokuシリーズはポータル(`index.html`)から各ミニゲーム(単一HTMLファイル)へ遷移する構成。
9タイトル予定、現在3タイトル稼働中(Angry Mokumoku / Moyomoyo / MK Mobile)。

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

## 4. 「ポータルへ戻る」導線

各ゲーム画面の左上に、ポータル(`index.html`)へ戻る小さなボタンを共通配置する。

- **配置**: 画面左上に `position: fixed`。セーフエリア対応のため `env(safe-area-inset-*)` を考慮した余白を確保。
- **見た目**: ゲームのプレイを邪魔しない最小サイズの丸ボタン(アイコンのみ、ラベルなし)。半透明の黒背景 + 白系アイコンで、どのアクセントカラーの上でも視認できるようにする(ゲームごとの `--hi` に依存させない)。
- **アイコン**: `←`(矢印)を採用。ポータルの絵文字トーンに合わせ `🦉` も検討したが、視認性優先で矢印に決定。
- **挙動**: タップで `index.html` に遷移。進行中のゲームがある場合は確認ダイアログなどは出さず即遷移(セーブは各ゲーム側で都度自動保存する前提のため)。
- **共通スニペット(案)**: `shared/moku-ui.css` に `.moku-back` クラスとして定義し、各ゲームHTMLの `<body>` 直下に以下を配置する。
  ```html
  <a class="moku-back" href="index.html" aria-label="Back to Moku Series">←</a>
  ```
  ```css
  .moku-back {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 12px);
    left: calc(env(safe-area-inset-left, 0px) + 12px);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(10, 11, 18, 0.55);
    backdrop-filter: blur(4px);
    color: #EDEEF6;
    font-size: 18px;
    font-weight: 700;
    text-decoration: none;
    z-index: 1000;
    transition: background .15s ease, transform .15s ease;
  }
  .moku-back:hover, .moku-back:focus-visible {
    background: rgba(10, 11, 18, 0.8);
    transform: scale(1.05);
  }
  ```

## 未決事項 / 次に決めること

- [ ] `shared/moku-ui.css`・`shared/moku-save.js` の実ファイルを作成するか
- [x] 各ゲーム画面への「ポータルへ戻る」ボタンのデザイン(上記4章で決定)
- [ ] 広告/課金/ランキングなど収益化まわりの共通化(今回は対象外)
- [ ] 残り6タイトルのアクセントカラー割り当てルール

## 開発履歴について

各ゲームファイルの開発履歴は `aohaus/Dev` から `git merge --allow-unrelated-histories -s ours` で本リポジトリに統合済み。
ワークツリーの内容は変わらないが、コミットログは残っている。ただし**通常の `git log -- <file>` は merge simplification により古い履歴が省略される**ため、
過去の開発経緯を追うときは必ず `--full-history` を付けること。

```sh
git log --full-history --oneline -- moyomoyo.html
```
