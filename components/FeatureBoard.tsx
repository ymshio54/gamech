import ArticleGrid, { type CardArticle } from '@/components/ArticleGrid';

type Group = {
  id: string;
  name: string;
  articles: CardArticle[];
};

export default function FeatureBoard({ groups }: { groups: Group[] }) {
  if (groups.length === 0) {
    return <p className="empty">表示できる記事がありません。</p>;
  }

  return (
    <div className="release-board">
      {groups.map((group) => (
        <section key={group.id} className="release-group" aria-labelledby={`group-${group.id}`}>
          <h2 id={`group-${group.id}`}>
            {group.name}
            <span className="count">{group.articles.length}</span>
          </h2>
          <ArticleGrid articles={group.articles} />
        </section>
      ))}
    </div>
  );
}
