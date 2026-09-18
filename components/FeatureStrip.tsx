import Link from 'next/link';
import ArticleGrid, { type CardArticle } from '@/components/ArticleGrid';

type Props = {
  id: string;
  title: string;
  href: string;
  linkLabel: string;
  articles: CardArticle[];
};

export default function FeatureStrip({ id, title, href, linkLabel, articles }: Props) {
  if (articles.length === 0) return null;

  return (
    <section className="upcoming" aria-labelledby={id}>
      <div className="upcoming-head">
        <h2 id={id}>{title}</h2>
        <Link href={href}>{linkLabel}</Link>
      </div>
      <ArticleGrid articles={articles} />
    </section>
  );
}
