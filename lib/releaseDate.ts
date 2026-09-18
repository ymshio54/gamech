import { isReleaseText } from './categories';
import {
  addDays,
  extractFirstDate,
  formatMonthDay,
  tokyoMidnightMs,
  tokyoYmd,
  type Ymd,
} from './dates';
import { articleText } from './text';

export type ReleaseBucketId = 'today' | 'soon' | 'later' | 'past' | 'unknown';

export type ReleaseHint = {
  /** タイトル／本文から読めた発売日。日付なしの「今週発売」は null */
  date: Date | null;
  /** 並び替え用。日付なしの近日は週末扱い */
  sortKey: number;
  bucket: ReleaseBucketId;
  /** カードに出す短いラベル（本日発売 / 近日発売 など） */
  label: string;
};

const TOKYO_WEEKEND_OFFSET = 6;

function kindOf(text: string): 'reserve' | 'release' {
  if (/予約開始|予約受付/.test(text) && !/発売/.test(text)) return 'reserve';
  return 'release';
}

function labelOf(bucket: ReleaseBucketId, ymd: Ymd | null, today: Ymd, kind: 'reserve' | 'release'): string {
  const noun = kind === 'reserve' ? '予約開始' : '発売';
  if (bucket === 'today') return kind === 'reserve' ? '本日予約開始' : '本日発売';
  if (bucket === 'soon') return kind === 'reserve' ? '近日予約開始' : '近日発売';
  if (bucket === 'past') return '発売済み';
  if (ymd) return `${formatMonthDay(ymd, today)}${noun}`;
  if (kind === 'reserve') return '予約開始';
  return '発売予定';
}

function bucketOf(delta: number): ReleaseBucketId {
  if (delta < 0) return 'past';
  if (delta === 0) return 'today';
  if (delta <= 6) return 'soon';
  return 'later';
}

function fromExtracted(
  extracted: { ymd: Ymd; ms: number; delta: number },
  today: Ymd,
  kind: 'reserve' | 'release',
): ReleaseHint {
  const bucket = bucketOf(extracted.delta);
  return {
    date: new Date(extracted.ms),
    sortKey: extracted.ms,
    bucket,
    label: labelOf(bucket, extracted.ymd, today, kind),
  };
}

const RELEASE_NEAR =
  /(\d{4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日.{0,12}(発売|配信開始|配信へ|配信決定|リリース|予約開始)|((発売|配信開始|予約開始).{0,12}(\d{4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日)/;

function extractReleaseDate(title: string, summary: string, now: Date) {
  const fromTitle = extractFirstDate(title, now);
  if (fromTitle) return fromTitle;
  const window = summary.normalize('NFKC').match(RELEASE_NEAR);
  return window ? extractFirstDate(window[0], now) : null;
}

/**
 * タイトルと本文から発売・配信・予約日を読む。
 * 日付が無くても発売系の表現があれば unknown を返す。
 */
export function parseReleaseHint(
  source: string | { title: string; summary?: string; publishedAt?: string | null },
  now = new Date(),
): ReleaseHint | null {
  const title = typeof source === 'string' ? source : source.title;
  const summary = typeof source === 'string' ? '' : (source.summary ?? '');
  const publishedAt = typeof source === 'string' ? null : (source.publishedAt ?? null);
  const titleNorm = title.normalize('NFKC');
  const combined = articleText(title, summary).normalize('NFKC');
  const today = tokyoYmd(now);
  const kind = kindOf(combined);

  const extracted = extractReleaseDate(title, summary, now);
  if (extracted) {
    return fromExtracted(extracted, today, kind);
  }

  if (
    (/(本日|今日).{0,8}(発売|配信開始|予約開始|リリース)|(発売|配信開始).{0,8}(本日|今日)/.test(titleNorm) ||
      /本日発売|今日発売/.test(combined))
  ) {
    return {
      date: new Date(tokyoMidnightMs(today)),
      sortKey: tokyoMidnightMs(today),
      bucket: 'today',
      label: labelOf('today', today, today, kind),
    };
  }

  if (/今週発売|今週配信|今週末/.test(combined) || /近日発売|近日配信|発売迫|まもなく発売/.test(combined)) {
    const weekend = addDays(today, TOKYO_WEEKEND_OFFSET);
    return {
      date: null,
      sortKey: tokyoMidnightMs(weekend),
      bucket: 'soon',
      label: labelOf('soon', null, today, kind),
    };
  }

  if (
    publishedAt &&
    /正式リリース|本日発売|配信開始/.test(titleNorm) &&
    tokyoYmd(new Date(publishedAt)).year === today.year &&
    tokyoYmd(new Date(publishedAt)).month === today.month &&
    tokyoYmd(new Date(publishedAt)).day === today.day
  ) {
    return {
      date: new Date(tokyoMidnightMs(today)),
      sortKey: tokyoMidnightMs(today),
      bucket: 'today',
      label: labelOf('today', today, today, kind),
    };
  }

  if (kind === 'reserve' || isReleaseText(title, summary)) {
    return {
      date: null,
      sortKey: Number.MAX_SAFE_INTEGER,
      bucket: 'unknown',
      label: labelOf('unknown', null, today, kind),
    };
  }

  return null;
}

export const RELEASE_BUCKETS: { id: ReleaseBucketId; name: string }[] = [
  { id: 'today', name: '本日' },
  { id: 'soon', name: '近日' },
  { id: 'later', name: '今後' },
  { id: 'unknown', name: '日付不明' },
  { id: 'past', name: '発売済み' },
];

export type ArticleWithRelease<T extends { title: string; publishedAt: string | null }> = T & {
  release: ReleaseHint | null;
};

export function withReleaseHints<T extends { title: string; summary?: string; publishedAt: string | null }>(
  articles: T[],
  now = new Date(),
): ArticleWithRelease<T>[] {
  return articles.map((article) => ({ ...article, release: parseReleaseHint(article, now) }));
}

/** 発売タブ用。日付が近い順 → 日付不明は新しい記事順 */
export function sortReleaseArticles<T extends { publishedAt: string | null; release: ReleaseHint | null }>(
  articles: T[],
): T[] {
  return [...articles].sort((left, right) => {
    const leftKey = left.release?.sortKey ?? Number.MAX_SAFE_INTEGER;
    const rightKey = right.release?.sortKey ?? Number.MAX_SAFE_INTEGER;
    if (leftKey !== rightKey) return leftKey - rightKey;
    const leftPub = left.publishedAt ? Date.parse(left.publishedAt) : 0;
    const rightPub = right.publishedAt ? Date.parse(right.publishedAt) : 0;
    return rightPub - leftPub;
  });
}

export function isUpcomingRelease(release: ReleaseHint | null): boolean {
  return Boolean(release && release.bucket !== 'past');
}

export function groupByReleaseBucket<T extends { release: ReleaseHint | null }>(
  articles: T[],
): { id: ReleaseBucketId; name: string; articles: T[] }[] {
  const grouped = new Map<ReleaseBucketId, T[]>();
  for (const bucket of RELEASE_BUCKETS) grouped.set(bucket.id, []);
  for (const article of articles) {
    grouped.get(article.release?.bucket ?? 'unknown')?.push(article);
  }
  return RELEASE_BUCKETS.map((bucket) => ({
    ...bucket,
    articles: grouped.get(bucket.id) ?? [],
  })).filter((bucket) => bucket.articles.length > 0 && bucket.id !== 'past');
}

/** すべてのタブ先頭に出す「発売間近」。日付が近い順、最大 limit 件 */
export function upcomingReleases<T extends { publishedAt: string | null; release: ReleaseHint | null }>(
  articles: T[],
  limit = 6,
): T[] {
  return sortReleaseArticles(
    articles.filter(
      (article) =>
        article.release &&
        (article.release.bucket === 'today' ||
          article.release.bucket === 'soon' ||
          article.release.bucket === 'later'),
    ),
  ).slice(0, limit);
}
