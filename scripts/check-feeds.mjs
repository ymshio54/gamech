// RSSのURLが生きているか・サムネイルが取れるかを確認する開発用スクリプト
// 使い方: node scripts/check-feeds.mjs [追加URL...]
import Parser from 'rss-parser';

const EXTRA = process.argv.slice(2);

const DEFAULT_URLS = [
  'https://www.4gamer.net/rss/index.xml',
  'https://www.gamespark.jp/rss20/index.rdf',
  'https://automaton-media.com/feed/',
  'https://news.denfaminicogamer.jp/feed',
  'https://jp.ign.com/feed.xml',
];

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'game-news-rss/0.1 (+https://example.com)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail', { keepArray: true }],
      ['media:content', 'mediaContent', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

function mediaUrl(node) {
  if (!node) return null;
  if (Array.isArray(node)) return node.map(mediaUrl).find(Boolean) ?? null;
  if (typeof node === 'string') return node;
  return node?.$?.url ?? null;
}

function htmlImage(html) {
  if (typeof html !== 'string') return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

for (const url of [...DEFAULT_URLS, ...EXTRA]) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items ?? [];
    const withThumb = items.filter(
      (item) =>
        mediaUrl(item.mediaThumbnail) ||
        mediaUrl(item.mediaContent) ||
        (item.enclosure?.type?.startsWith('image/') && item.enclosure.url) ||
        htmlImage(item.contentEncoded) ||
        htmlImage(item.content),
    ).length;
    const sample = items[0];
    console.log(
      `OK   ${url}\n     title=${feed.title} items=${items.length} thumb=${withThumb}` +
        `\n     keys=${sample ? Object.keys(sample).join(',') : '-'}`,
    );
  } catch (error) {
    console.log(`FAIL ${url}\n     ${error.message}`);
  }
}
