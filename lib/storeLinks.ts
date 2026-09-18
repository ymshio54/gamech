import type { HardwareId } from './platforms';
import { hardwareOf } from './platforms';

export type StoreLink = {
  id: HardwareId | 'search';
  label: string;
  href: string;
};

function extractGameName(title: string): string {
  const quoted =
    title.match(/『([^』]{2,80})』/) ??
    title.match(/「([^」]{2,80})」/) ??
    title.match(/"([^"]{2,80})"/);
  if (quoted?.[1]) return quoted[1].trim();
  return title
    .replace(/【[^】]*】/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function firstUrl(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match?.[0] ?? null;
}

const STORE_URL: Record<HardwareId, { label: string; search: (q: string) => string; direct: RegExp }> = {
  steam: {
    label: 'Steamで見る',
    search: (q) => `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}`,
    direct: /https?:\/\/store\.steampowered\.com\/app\/[0-9]+[^\s"'<>]*/i,
  },
  ps5: {
    label: 'PS Storeで見る',
    search: (q) => `https://store.playstation.com/ja-jp/search/${encodeURIComponent(q)}`,
    direct: /https?:\/\/store\.playstation\.com\/[^\s"'<>]+/i,
  },
  switch: {
    label: 'eShopで見る',
    search: (q) => `https://store-jp.nintendo.com/search/?q=${encodeURIComponent(q)}`,
    direct: /https?:\/\/store-jp\.nintendo\.com\/[^\s"'<>]+/i,
  },
  xbox: {
    label: 'Xboxで見る',
    search: (q) => `https://www.xbox.com/ja-JP/search?q=${encodeURIComponent(q)}`,
    direct: /https?:\/\/www\.xbox\.com\/[^\s"'<>]+/i,
  },
};

/** セール・発売カード向け。本文にストアURLがあればそれを使い、なければ機種のストア検索へ飛ばす。 */
export function storeLinksOf(article: { title: string; description?: string; summary?: string }): StoreLink[] {
  const blob = `${article.title}\n${article.description ?? ''}\n${article.summary ?? ''}`;
  const query = extractGameName(article.title);
  const detected = hardwareOf(article);
  const targets = detected.length > 0 ? detected : [];

  if (targets.length === 0) {
    return [
      {
        id: 'search',
        label: 'ストアで探す',
        href: `https://www.google.com/search?q=${encodeURIComponent(`${query} 公式ストア`)}`,
      },
    ];
  }

  return targets.map((platform) => {
    const id = platform.id as HardwareId;
    const spec = STORE_URL[id];
    return {
      id,
      label: spec.label,
      href: firstUrl(blob, spec.direct) ?? spec.search(query),
    };
  });
}

export function xShareHref(title: string, url: string): string {
  const params = new URLSearchParams({ text: title, url });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}
