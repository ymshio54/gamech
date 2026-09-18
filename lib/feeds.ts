import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import Parser from 'rss-parser';
import { stripHtml } from './text';

export type FeedSource = {
  id: string;
  name: string;
  url: string;
};

/** 取得対象のRSS。増やしたいサイトはここに追記する。 */
export const FEED_SOURCES: FeedSource[] = [
  { id: '4gamer', name: '4Gamer.net', url: 'https://www.4gamer.net/rss/index.xml' },
  { id: 'gamespark', name: 'Game*Spark', url: 'https://www.gamespark.jp/rss20/index.rdf' },
  { id: 'automaton', name: 'AUTOMATON', url: 'https://automaton-media.com/feed/' },
  { id: 'ign', name: 'IGN Japan', url: 'https://jp.ign.com/feed.xml' },
  { id: 'denfami', name: '電ファミニコゲーマー', url: 'https://news.denfaminicogamer.jp/feed' },
];

/** 1サイトあたりの取得件数。RSSは100件返すサイトもあるので新着だけに絞る */
const ITEMS_PER_SOURCE = 20;

/**
 * RSS取得結果をキャッシュする秒数（15分）。
 * 期限が切れた後の最初のアクセスには古いキャッシュをそのまま返し、
 * 裏で新しいデータを取り直す（stale-while-revalidate）。
 * app/page.tsx の revalidate も同じ値にしておく。
 */
export const FEED_REVALIDATE_SECONDS = 15 * 60;

/** revalidateTag() で手動更新したいとき用のタグ */
export const FEEDS_CACHE_TAG = 'feeds';

/** 4GamerのようにRSSへ画像を含めないサイト向けに、記事ページのog:imageを補完する件数 */
const OG_IMAGE_LOOKUP_LIMIT = 30;
const OG_IMAGE_CONCURRENCY = 6;

/** og:imageは記事公開後ほぼ変わらないので長めにキャッシュする */
const OG_IMAGE_REVALIDATE_SECONDS = 60 * 60 * 24;

export type Article = {
  /** リンクURLを一意キーとして使う */
  id: string;
  title: string;
  /** RSSの description / contentSnippet。ハード判定用 */
  description: string;
  /** RSS本文からHTMLを除いたテキスト。発売日・セール・ハード判定に使う */
  summary: string;
  link: string;
  /** ISO文字列。日付が取れなかった記事は null */
  publishedAt: string | null;
  thumbnail: string | null;
  sourceId: string;
  sourceName: string;
};

export type FeedResult = {
  source: FeedSource;
  articles: Article[];
  /** 取得に失敗した場合のメッセージ */
  error: string | null;
};

type RawItem = Parser.Item & Record<string, unknown>;

const FEED_HEADERS = {
  // UAを付けないと弾くサイトがあるため
  'User-Agent': 'game-news-rss/0.1 (+https://example.com)',
  Accept: 'application/rss+xml, application/xml, text/xml, */*',
};

const parser = new Parser<Record<string, unknown>, RawItem>({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:content', 'mediaContent', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
      ['description', 'rssDescription'],
    ],
  },
});

function firstImageUrlFromHtml(html: unknown): string | null {
  if (typeof html !== 'string') return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/** media:* 要素は `{ $: { url } }` か、その配列で入ってくる */
function urlFromMediaNode(node: unknown): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const entry of node) {
      const url = urlFromMediaNode(entry);
      if (url) return url;
    }
    return null;
  }
  if (typeof node === 'string') return node;
  if (typeof node === 'object') {
    const attrs = (node as { $?: { url?: string } }).$;
    if (attrs?.url) return attrs.url;
  }
  return null;
}

/** 相対URLやプロトコル相対URLを絶対URLに直す */
function toAbsoluteUrl(url: string | null, baseUrl: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractThumbnail(item: RawItem, baseUrl: string): string | null {
  const url =
    urlFromMediaNode(item.mediaThumbnail) ??
    urlFromMediaNode(item.mediaContent) ??
    (item.enclosure?.type?.startsWith('image/') ? item.enclosure.url ?? null : null) ??
    firstImageUrlFromHtml(item.contentEncoded) ??
    firstImageUrlFromHtml(item.content) ??
    firstImageUrlFromHtml(item.summary) ??
    null;
  return toAbsoluteUrl(url, baseUrl);
}

function metaContent(html: string, key: string): string | null {
  const tag = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i'),
  )?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
}

/** 記事ページのHTMLからog:image（なければtwitter:image）を読む */
async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; game-news-rss/0.1)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: OG_IMAGE_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const head = html.slice(0, html.indexOf('</head>') + 1 || 60_000);
    const image = metaContent(head, 'og:image') ?? metaContent(head, 'twitter:image');
    return toAbsoluteUrl(image, articleUrl);
  } catch {
    return null;
  }
}

/** サムネイルが取れなかった記事だけ、og:imageで穴埋めする */
async function fillMissingThumbnails(articles: Article[]): Promise<void> {
  const targets = articles.filter((article) => !article.thumbnail).slice(0, OG_IMAGE_LOOKUP_LIMIT);

  for (let i = 0; i < targets.length; i += OG_IMAGE_CONCURRENCY) {
    const chunk = targets.slice(i, i + OG_IMAGE_CONCURRENCY);
    const images = await Promise.all(chunk.map((article) => fetchOgImage(article.link)));
    chunk.forEach((article, index) => {
      article.thumbnail = images[index];
    });
  }
}

function extractPublishedAt(item: RawItem): string | null {
  const raw = item.isoDate ?? item.pubDate ?? (item.date as string | undefined);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

const DESCRIPTION_MAX = 800;
const BODY_MAX = 4000;

function asPlainText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? stripHtml(value) : '';
}

function extractDescription(item: RawItem): string {
  return asPlainText(item.contentSnippet || item.summary || item.rssDescription).slice(0, DESCRIPTION_MAX);
}

function extractBody(item: RawItem): string {
  return asPlainText(item.contentEncoded || item.content).slice(0, BODY_MAX);
}

async function fetchFeed(source: FeedSource): Promise<FeedResult> {
  try {
    // rss-parserのparseURLは内部で非推奨のurl.parse()を使うため、取得はfetchで行う。
    // Nextのfetchキャッシュに乗せられる利点もある。
    const response = await fetch(source.url, {
      headers: FEED_HEADERS,
      signal: AbortSignal.timeout(10_000),
      // Next 15 は fetch をデフォルトでキャッシュしない。revalidate を付けると
      // Data Cache に乗り、期限切れ後は stale-while-revalidate で裏更新される。
      next: { revalidate: FEED_REVALIDATE_SECONDS, tags: [FEEDS_CACHE_TAG] },
    });
    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }
    const feed = await parser.parseString(await response.text());
    const articles = (feed.items ?? [])
      .filter((item): item is RawItem => Boolean(item.link && item.title))
      .slice(0, ITEMS_PER_SOURCE)
      .map((item) => ({
        id: item.link as string,
        title: (item.title as string).trim(),
        description: extractDescription(item),
        summary: extractBody(item) || extractDescription(item),
        link: item.link as string,
        publishedAt: extractPublishedAt(item),
        thumbnail: extractThumbnail(item, item.link as string),
        sourceId: source.id,
        sourceName: source.name,
      }));
    return { source, articles, error: null };
  } catch (error) {
    // 1サイト落ちても他サイトは表示したいので、エラーは結果に載せて返す
    const message = error instanceof Error ? error.message : String(error);
    return { source, articles: [], error: message };
  }
}

export type FeedsPayload = {
  articles: Article[];
  errors: { source: FeedSource; message: string }[];
};

/** 全ソースを表すキャッシュキー。unstable_cache のキーに undefined を渡さないため */
const ALL_SOURCES_KEY = 'all';

/** 指定ソース（未指定なら全ソース）を並列取得し、投稿日時の新しい順に並べて返す */
async function buildPayload(sourceId?: string): Promise<FeedsPayload> {
  const targets = sourceId
    ? FEED_SOURCES.filter((source) => source.id === sourceId)
    : FEED_SOURCES;

  const results = await Promise.all(targets.map(fetchFeed));

  const articles = results
    .flatMap((result) => result.articles)
    .sort((a, b) => {
      const left = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const right = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return right - left;
    });

  await fillMissingThumbnails(articles);

  const errors = results
    .filter((result) => result.error !== null)
    .map((result) => ({ source: result.source, message: result.error as string }));

  return { articles, errors };
}

/**
 * og:imageの補完まで含めた結果をまるごとキャッシュする。
 * RSSのfetch単位でもキャッシュしているが、ここで包むことで
 * 並べ替えやog:image取得のやり直しも15分に1回で済む。
 */
const getCachedPayload = unstable_cache(
  (sourceKey: string) => buildPayload(sourceKey === ALL_SOURCES_KEY ? undefined : sourceKey),
  ['game-news-articles-v3'],
  { revalidate: FEED_REVALIDATE_SECONDS, tags: [FEEDS_CACHE_TAG] },
);

/**
 * 記事一覧を取得する。キャッシュは15分で期限切れになり、
 * その後の最初のアクセスには古い内容を返しつつ裏側で更新される。
 * 1リクエスト中に複数回呼ばれても1回で済むよう cache() でも包む。
 */
export const fetchArticles = cache(
  (sourceId?: string): Promise<FeedsPayload> => getCachedPayload(sourceId ?? ALL_SOURCES_KEY),
);
