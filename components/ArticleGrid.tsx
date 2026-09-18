import ArticleCard from '@/components/ArticleCard';
import type { Article } from '@/lib/feeds';
import type { ReleaseHint } from '@/lib/releaseDate';
import type { SaleHint } from '@/lib/saleStatus';

export type CardArticle = Article & {
  release?: ReleaseHint | null;
  sale?: SaleHint | null;
};

export default function ArticleGrid({ articles }: { articles: CardArticle[] }) {
  return (
    <div className="grid">
      {articles.map((article) => (
        <ArticleCard
          key={`${article.sourceId}-${article.id}`}
          article={article}
          release={article.release}
          sale={article.sale}
        />
      ))}
    </div>
  );
}
