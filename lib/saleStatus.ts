import { extractFirstDate } from './dates';
import { articleText } from './text';

export type SalePhase = 'ongoing' | 'upcoming';

export type SaleHint = {
  phase: SalePhase;
  /** カードに出すラベル（開催中 / 開催予定） */
  label: string;
  date: Date | null;
  sortKey: number;
};

const UPCOMING_CUE = /開催予定|近日開催|まもなく開催|近日スタート|より開催|から開催|より開始|からスタート|よりセール/;
const ONGOING_CUE = /開催中|実施中|配信中|セール中|実施しています|開催しています/;

function hint(phase: SalePhase, date: Date | null, sortKey: number): SaleHint {
  return {
    phase,
    label: phase === 'ongoing' ? '開催中' : '開催予定',
    date,
    sortKey,
  };
}

/**
 * タイトルと本文の文脈からセールの「開催中 / 開催予定」を判別する。
 * 日付も文脈もない場合は、すでに始まっているものとして開催中にする。
 */
export function parseSaleHint(
  source: string | { title: string; summary?: string },
  now = new Date(),
): SaleHint {
  const title = typeof source === 'string' ? source : source.title;
  const summary = typeof source === 'string' ? '' : (source.summary ?? '');
  const combined = articleText(title, summary).normalize('NFKC');
  const extracted = extractFirstDate(title, now) ?? (() => {
    const near = combined.match(
      /(\d{4}\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日.{0,12}(開催|開始|スタート|まで)|((より|から).{0,8}開催)/,
    );
    return near ? extractFirstDate(near[0], now) : null;
  })();
  const date = extracted ? new Date(extracted.ms) : null;
  const publishedSort = Number.MAX_SAFE_INTEGER;

  const hasUpcomingCue = UPCOMING_CUE.test(combined);
  const hasOngoingCue = ONGOING_CUE.test(combined);
  const hasUntil = /まで/.test(combined);
  const hasFrom = /より|から/.test(combined);

  if (extracted && hasFrom && extracted.delta > 0) {
    return hint('upcoming', date, extracted.ms);
  }
  if (extracted && hasUntil && extracted.delta >= 0) {
    return hint('ongoing', date, extracted.ms);
  }
  if (hasUpcomingCue && (!extracted || extracted.delta > 0) && !hasOngoingCue) {
    return hint('upcoming', date, extracted?.ms ?? publishedSort);
  }
  if (extracted && extracted.delta > 0 && /開催|スタート|開始/.test(combined) && !hasOngoingCue) {
    return hint('upcoming', date, extracted.ms);
  }
  if (hasOngoingCue) {
    return hint('ongoing', date, extracted?.ms ?? publishedSort);
  }

  return hint('ongoing', date, extracted?.ms ?? publishedSort);
}

export const SALE_PHASES: { id: SalePhase; name: string }[] = [
  { id: 'ongoing', name: '開催中' },
  { id: 'upcoming', name: '開催予定' },
];

export type ArticleWithSale<T> = T & { sale: SaleHint | null };

export function withSaleHints<T extends { title: string; summary?: string }>(
  articles: T[],
  now = new Date(),
): ArticleWithSale<T>[] {
  return articles.map((article) => ({ ...article, sale: parseSaleHint(article, now) }));
}

export function sortSaleArticles<T extends { publishedAt: string | null; sale: SaleHint | null }>(
  articles: T[],
): T[] {
  return [...articles].sort((left, right) => {
    const leftUpcoming = left.sale?.phase === 'upcoming' ? 0 : 1;
    const rightUpcoming = right.sale?.phase === 'upcoming' ? 0 : 1;
    if (leftUpcoming !== rightUpcoming) return leftUpcoming - rightUpcoming;
    const leftKey = left.sale?.sortKey ?? Number.MAX_SAFE_INTEGER;
    const rightKey = right.sale?.sortKey ?? Number.MAX_SAFE_INTEGER;
    if (leftKey !== rightKey) return leftKey - rightKey;
    const leftPub = left.publishedAt ? Date.parse(left.publishedAt) : 0;
    const rightPub = right.publishedAt ? Date.parse(right.publishedAt) : 0;
    return rightPub - leftPub;
  });
}

export function groupBySalePhase<T extends { publishedAt: string | null; sale: SaleHint | null }>(
  articles: T[],
): { id: SalePhase; name: string; articles: T[] }[] {
  const grouped = new Map<SalePhase, T[]>();
  for (const phase of SALE_PHASES) grouped.set(phase.id, []);
  for (const article of articles) {
    grouped.get(article.sale?.phase ?? 'ongoing')?.push(article);
  }
  return SALE_PHASES.map((phase) => ({
    ...phase,
    articles: sortWithinPhase(grouped.get(phase.id) ?? [], phase.id),
  })).filter((phase) => phase.articles.length > 0);
}

/** すべてのタブ先頭に出すセール。開催予定と開催中を混ぜて最大 limit 件 */
export function highlightSales<T extends { publishedAt: string | null; sale: SaleHint | null }>(
  articles: T[],
  limit = 6,
): T[] {
  const groups = groupBySalePhase(articles.filter((article) => article.sale));
  const upcoming = groups.find((group) => group.id === 'upcoming')?.articles ?? [];
  const ongoing = groups.find((group) => group.id === 'ongoing')?.articles ?? [];
  const half = Math.max(1, Math.floor(limit / 2));
  const upcomingTake = upcoming.slice(0, half);
  const ongoingTake = ongoing.slice(0, limit - upcomingTake.length);
  if (upcomingTake.length + ongoingTake.length < limit) {
    return [...upcomingTake, ...ongoingTake, ...upcoming.slice(upcomingTake.length)].slice(0, limit);
  }
  return [...upcomingTake, ...ongoingTake];
}

function sortWithinPhase<T extends { publishedAt: string | null; sale: SaleHint | null }>(
  articles: T[],
  phase: SalePhase,
): T[] {
  return [...articles].sort((left, right) => {
    const leftKey = left.sale?.sortKey ?? Number.MAX_SAFE_INTEGER;
    const rightKey = right.sale?.sortKey ?? Number.MAX_SAFE_INTEGER;
    if (phase === 'upcoming' && leftKey !== rightKey) return leftKey - rightKey;
    const leftPub = left.publishedAt ? Date.parse(left.publishedAt) : 0;
    const rightPub = right.publishedAt ? Date.parse(right.publishedAt) : 0;
    return rightPub - leftPub;
  });
}
