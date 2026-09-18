# ゲームニュースまとめ

4Gamer.net / Game*Spark / AUTOMATON / IGN Japan / 電ファミニコゲーマー のRSSをサーバー側で取得し、
新着記事を「サムネイル画像・タイトル・投稿日時」のカードで一覧表示するNext.jsアプリです。

## 使い方

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm run build && npm run start   # 本番モード
npm run typecheck                # 型チェックのみ
```

> `npm run dev` を起動したまま `npm run build` を実行しないでください。
> どちらも同じ `.next` フォルダを使うため、dev側のマニフェストが壊れてCSSやJSが読み込まれなくなります
> （画像とテキストだけの素のHTMLが表示される状態）。そうなったら dev を止めて `.next` を削除し、`npm run dev` で再起動すれば直ります。
>
> dev を止めずにビルドを確認したいときは、出力先を分けてください。
>
> ```bash
> NEXT_DIST_DIR=.next-build npx next build          # bash
> $env:NEXT_DIST_DIR=".next-build"; npx next build  # PowerShell
> ```

## 構成

| ファイル | 役割 |
| --- | --- |
| `lib/feeds.ts` | RSS取得・サムネイル抽出・並べ替え。配信元の定義もここ |
| `lib/categories.ts` | タイトル＋本文から「発売間近」「セール情報」を判定。キーワードの定義もここ |
| `lib/releaseDate.ts` | 発売日の抽出、近い順ソート、「本日発売 / 近日発売」バッジ |
| `lib/saleStatus.ts` | セールの開催中 / 開催予定の判別 |
| `lib/format.ts` | 日時の表示整形（`Asia/Tokyo`、24時間以内は「〇分前」も併記） |
| `lib/query.ts` | 絞り込み条件（`source` / `category` / `q` / `platform`）のURL組み立て |
| `lib/platforms.ts` | PS5 / Switch / Steam / Xbox の判定 |
| `lib/storeLinks.ts` | ストア検索リンクとX共有URL |
| `app/page.tsx` | 一覧ページ（サーバーコンポーネント）。`?category=` と `?source=` で絞り込み |
| `components/ArticleCard.tsx` | カード1枚。発売・セールのバッジ、X共有、ストアボタン |
| `components/SearchBar.tsx` | キーワード検索 |
| `components/PlatformFilter.tsx` | ハード絞り込み（PS5 / Switch / Steam / Xbox） |
| `components/FeatureStrip.tsx` | 「すべて」タブ先頭の発売間近 / セール情報セクション |
| `components/FeatureBoard.tsx` | 発売間近・セール情報タブのグループ表示 |
| `components/RelativeTime.tsx` | 「〇分前」をクライアント側で描画する唯一のクライアントコンポーネント |
| `components/CategoryFilter.tsx` | 「すべて／発売間近／セール情報」のタブ |
| `components/SourceFilter.tsx` | サイト絞り込みのタブ |
| `scripts/check-feeds.mjs` | RSSが生きているか・画像が取れるかを確認する開発用スクリプト |
| `scripts/check-categories.mjs` | カテゴリ判定を手元のタイトルで試す開発用スクリプト |

## 配信元を追加する

`lib/feeds.ts` の `FEED_SOURCES` に追記するだけです。

```ts
{ id: 'gamer', name: 'GAMER', url: 'https://www.gamer.ne.jp/news/feed/' }
```

追加したURLが生きているかは次で確認できます。

```bash
node scripts/check-feeds.mjs https://example.com/feed
```

## レイアウト

CSSはモバイルファーストで、`640px` を境に切り替えています（`app/globals.css`）。

| | スマホ（〜639px） | タブレット・PC（640px〜） |
| --- | --- | --- |
| カード | サムネイル左・本文右の横並び1列 | サムネイル上・本文下の縦積みグリッド（`minmax(220px, 1fr)`） |
| カテゴリタブ | 画面上部に固定（`position: sticky`）。3つが収まらない場合は横スクロール | 通常配置 |
| サイト絞り込み | 1行のまま横スクロール | 折り返し表示 |
| ホバー演出 | なし（`@media (hover: hover)` で除外） | あり |

- 横スクロール行は画面端まで伸ばすため、`--page-padding` 分のネガティブマージンを当てています。
- タブのタップ領域は高さ44pxを確保しています。
- 390px幅で1画面あたり約4.8件が並びます（縦積みのままだと約1.3件でした）。

## 検索・ハード絞り込み・共有

- 上部の検索バーは `?q=` でタイトルと本文を絞り込みます。Enter または「検索」で確定します。
- ハードタブは `?platform=` です。判定はタイトルとRSS概要（description）だけを使い、本文は使いません。
  - 明確な製品名が**1機種だけ**あるときだけ、そのハードタブに入れます（PS5 / PlayStation 5 / Nintendo Switch / Steam / Xbox など）。
  - 複数機種の併記（`PS5/Switch`）、機種名なし、`スイッチ` や単なる `PC` のようなあいまいな語はすべて「全般・マルチ」です。
- すべてのカード右下に「Xで共有」（Twitter Web Intent）。
- 発売間近・セール情報のカードには「Steamで見る」などのストアボタンを出します。本文にストアURLがあればそれを使い、なければ機種の公式ストア検索です。機種が分からないときは「ストアで探す」で検索します。

## カテゴリ判定

タイトルとRSS本文の先頭（HTMLを除いた約420文字）から判定します（`lib/categories.ts`）。

| タブ | 拾う表現 |
| --- | --- |
| 発売間近 | 発売 / リリース / 配信開始 / 配信決定 / 配信日 / 予約開始 / 予約受付 / 早期アクセス |
| セール情報 | セール / 割引 / 値下げ / 無料配布 / 無料配信 / 〇%OFF |

- 判定前にテキストを `NFKC` 正規化して大文字に揃えるため、「８５％ＯＦＦ」や「off」でも拾えます。
- 英字のみのキーワード（OFF）は前後が英字でないときだけ一致とみなします。
  これがないと `Official` や `Playoff` をセール情報と誤判定します。
- 「基本プレイ無料」や単独の「配信」（番組配信など）は対象外です。
- 両方に該当する記事はカードにバッジが2つ並びます。
- タブの件数はサイト絞り込み後の記事から数えるため、`?source=` と併用しても整合します。

### 発売間近

`lib/releaseDate.ts` がタイトル／本文から `〇月〇日発売` や `本日発売` を読み、発売日が近い順に並べます。

| バッジ | 条件 |
| --- | --- |
| 本日発売 | 今日、または「本日発売」 |
| 近日発売 | 明日〜1週間以内、「今週発売」「発売迫る」 |
| 日付ラベル | それ以降の発売日 |
| 予約開始 | 予約開始・予約受付（日付があれば併記） |

「すべて」タブ先頭に日付付きの直近6件、「発売間近」タブでは本日 / 近日 / 今後 / 日付不明に分けます。発売済みは一覧から外します。

### セール情報（開催中 / 開催予定）

`lib/saleStatus.ts` が「〇日より開催」「開催予定」なら開催予定、「開催中」「〇日まで」なら開催中とみなします。文脈が無い記事は開催中です。

キーワードを変えたときの挙動は次で確認できます。

```bash
node scripts/check-categories.mjs "最大85%OFFのセール開催中"
node --experimental-strip-types scripts/check-release-dates.ts "12月25日に発売"
```

## 仕様上のポイント

- **サムネイルの取得順**: `media:thumbnail` → `media:content` → 画像の `enclosure` → 本文HTMLの最初の `<img>`。
  4GamerのRSSは画像を一切含まないため、上記で取れなかった記事のみ記事ページの `og:image` を読みに行きます
  （`lib/feeds.ts` の `OG_IMAGE_LOOKUP_LIMIT` / `OG_IMAGE_CONCURRENCY` で件数と並列数を制限、結果は1日キャッシュ）。
- **キャッシュ（15分・バックグラウンド更新）**: `lib/feeds.ts` の `FEED_REVALIDATE_SECONDS`（900秒）を共通の期限にしています。
  期限が切れたあとの最初のアクセスには古い結果をそのまま返し、裏側でRSSを取り直します（stale-while-revalidate）。
  - RSSの `fetch(..., { next: { revalidate, tags } })` … Data Cache。配信元への負荷を抑える
  - `unstable_cache` … パース・並べ替え・og:image補完まで含めた一覧を15分キャッシュ
  - `app/page.tsx` の `export const revalidate` … ルートのデフォルト再検証間隔
  - 手動で捨てたいときは `revalidateTag('feeds')`（タグ名は `FEEDS_CACHE_TAG`）
  この挙動は `next start`（本番）で効きます。`next dev` ではリクエストごとに取り直すことがあります。
- **「〇分前」の表示**: レンダリング時刻に依存する値をサーバーで描画するとハイドレーションエラーになるため、
  `RelativeTime` でマウント後に描画し、1分ごとに更新しています。絶対時刻はサーバー側で描画するので初期表示から見えます。
- **取得失敗時**: 1サイトが落ちても他サイトはそのまま表示し、ページ上部に失敗したサイト名を出します。
- **件数**: 1サイトあたり `ITEMS_PER_SOURCE`（既定20件）まで。RSSが100件返すサイトもあるため新着だけに絞っています。
- **画像タグ**: 配信元の画像ドメインが多岐にわたるため、`next/image` ではなく `<img>` を使っています。
  `next/image` に変えたい場合は `next.config.mjs` の `images.remotePatterns` にドメインを列挙してください。
- RSSのURLはサイト側のリニューアルで変わることがあります（ファミ通.comは現在RSSが404のため外しています）。
