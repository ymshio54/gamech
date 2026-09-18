import FeatureBoard from '@/components/FeatureBoard';
import FeatureStrip from '@/components/FeatureStrip';
import ArticleGrid from '@/components/ArticleGrid';
import CategoryFilter from '@/components/CategoryFilter';
import PlatformFilter from '@/components/PlatformFilter';
import SearchBar from '@/components/SearchBar';
import SourceFilter from '@/components/SourceFilter';
import { isCategoryId, isReleaseText, isSaleText } from '@/lib/categories';
import { FEED_SOURCES, fetchArticles, type Article } from '@/lib/feeds';
import { formatPublishedAt } from '@/lib/format';
import { isPlatformId, matchesPlatform, PLATFORMS, type PlatformId } from '@/lib/platforms';
import { buildHref, type QueryState } from '@/lib/query';
import {
  groupByReleaseBucket,
  isUpcomingRelease,
  parseReleaseHint,
  sortReleaseArticles,
  upcomingReleases,
} from '@/lib/releaseDate';
import { groupBySalePhase, highlightSales, parseSaleHint, sortSaleArticles } from '@/lib/saleStatus';
import { normalize } from '@/lib/text';
import Link from 'next/link';

/**
 * ルートのデフォルト再検証間隔（15分 = 900秒）。
 * Next.js はここを静的解析するためリテラルにする。lib/feeds.ts の
 * FEED_REVALIDATE_SECONDS と同じ値に保つこと。
 *
 * RSS本体のキャッシュは lib/feeds.ts の fetch `next.revalidate` と
 * `unstable_cache` が担い、期限切れ後は古い結果を返しつつ裏で更新する。
 */
export const revalidate = 900;

type PageProps = {
  searchParams: Promise<{ source?: string; category?: string; q?: string; platform?: string }>;
};

type EnrichedArticle = Article & {
  release: ReturnType<typeof parseReleaseHint>;
  sale: ReturnType<typeof parseSaleHint> | null;
};

function enrichArticles(articles: Article[]): EnrichedArticle[] {
  return articles.map((article) => ({
    ...article,
    release: isReleaseText(article.title, article.summary, article.description)
      ? parseReleaseHint({ ...article, summary: [article.description, article.summary].filter(Boolean).join('\n') })
      : null,
    sale: isSaleText(article.title, article.summary, article.description)
      ? parseSaleHint({ ...article, summary: [article.description, article.summary].filter(Boolean).join('\n') })
      : null,
  }));
}

function matchesQuery(article: Article, q?: string): boolean {
  if (!q) return true;
  const needle = normalize(q);
  return (
    normalize(article.title).includes(needle) ||
    normalize(article.description).includes(needle) ||
    normalize(article.summary).includes(needle)
  );
}

export default async function Home({ searchParams }: PageProps) {
  const { source, category, q: rawQuery, platform } = await searchParams;
  const activeSource = FEED_SOURCES.some((feed) => feed.id === source) ? source : undefined;
  const activeCategory = isCategoryId(category) ? category : undefined;
  const activeQuery = rawQuery?.trim() || undefined;
  const activePlatform = isPlatformId(platform) ? platform : undefined;
  const query: QueryState = {
    source: activeSource,
    category: activeCategory,
    q: activeQuery,
    platform: activePlatform,
  };

  const { articles, errors } = await fetchArticles(activeSource);
  const searched = enrichArticles(articles).filter((article) => matchesQuery(article, activeQuery));
  const platformCounts: Record<'all' | PlatformId, number> = {
    all: searched.length,
    ...(Object.fromEntries(
      PLATFORMS.map((platform) => [
        platform.id,
        searched.filter((article) => matchesPlatform(article, platform.id)).length,
      ]),
    ) as Record<PlatformId, number>),
  };
  const enriched = activePlatform
    ? searched.filter((article) => matchesPlatform(article, activePlatform))
    : searched;

  const releaseArticles = sortReleaseArticles(
    enriched.filter((article) => article.release && isUpcomingRelease(article.release)),
  );
  const saleArticles = sortSaleArticles(enriched.filter((article) => article.sale));

  const counts = {
    all: enriched.length,
    release: releaseArticles.length,
    sale: saleArticles.length,
  };

  const displayedArticles =
    activeCategory === 'release'
      ? releaseArticles
      : activeCategory === 'sale'
        ? saleArticles
        : enriched;
  const latest = displayedArticles.reduce<string | null>((best, article) => {
    if (!article.publishedAt) return best;
    if (!best || Date.parse(article.publishedAt) > Date.parse(best)) return article.publishedAt;
    return best;
  }, null);

  const releaseGroups = activeCategory === 'release' ? groupByReleaseBucket(releaseArticles) : [];
  const saleGroups = activeCategory === 'sale' ? groupBySalePhase(saleArticles) : [];
  const upcoming = activeCategory === undefined ? upcomingReleases(releaseArticles) : [];
  const sales = activeCategory === undefined ? highlightSales(saleArticles) : [];

  const emptyLabel = [
    activeQuery && `「${activeQuery}」`,
    activePlatform && PLATFORMS.find((item) => item.id === activePlatform)?.name,
  ]
    .filter(Boolean)
    .join(' / ');

  return (
    <main className="page">
      <header className="header">
        <h1>
          <Link href="/" className="logo">
            げむch
          </Link>
        </h1>
        <span className="meta">
          {displayedArticles.length}件
          {latest && ` / 最新: ${formatPublishedAt(latest)}`}
        </span>
      </header>

      <SearchBar query={query} />
      <PlatformFilter query={query} counts={platformCounts} />
      <CategoryFilter query={query} counts={counts} />
      <SourceFilter query={query} />

      {errors.length > 0 && (
        <div className="notice">
          一部のRSSを取得できませんでした。
          <ul>
            {errors.map((error) => (
              <li key={error.source.id}>
                {error.source.name}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {displayedArticles.length === 0 ? (
        <p className="empty">
          {emptyLabel ? `${emptyLabel} に一致する記事がありません。` : '表示できる記事がありません。'}
        </p>
      ) : activeCategory === 'release' ? (
        <FeatureBoard groups={releaseGroups} />
      ) : activeCategory === 'sale' ? (
        <FeatureBoard groups={saleGroups} />
      ) : (
        <>
          <FeatureStrip
            id="upcoming-heading"
            title="発売間近"
            href={buildHref({ ...query, category: 'release' })}
            linkLabel="発売予定をすべて見る"
            articles={upcoming}
          />
          <FeatureStrip
            id="sale-heading"
            title="セール情報"
            href={buildHref({ ...query, category: 'sale' })}
            linkLabel="セールをすべて見る"
            articles={sales}
          />
          <section className="feed" aria-labelledby="feed-heading">
            <div className="upcoming-head">
              <h2 id="feed-heading">すべてのニュース</h2>
            </div>
            <ArticleGrid articles={displayedArticles} />
          </section>
        </>
      )}
    </main>
  );
}
