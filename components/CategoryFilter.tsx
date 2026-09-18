import Link from 'next/link';
import { CATEGORIES, type CategoryId } from '@/lib/categories';
import { buildHref, type QueryState } from '@/lib/query';

type Props = {
  query: QueryState;
  /** タブに出す件数。キーは 'all' とカテゴリID */
  counts: Record<'all' | CategoryId, number>;
};

export default function CategoryFilter({ query, counts }: Props) {
  return (
    <nav className="tabs">
      <Link
        href={buildHref({ ...query, category: undefined })}
        aria-current={query.category ? undefined : 'page'}
      >
        すべて
        <span className="count">{counts.all}</span>
      </Link>
      {CATEGORIES.map((category) => (
        <Link
          key={category.id}
          href={buildHref({ ...query, category: category.id })}
          aria-current={query.category === category.id ? 'page' : undefined}
        >
          {category.name}
          <span className="count">{counts[category.id]}</span>
        </Link>
      ))}
    </nav>
  );
}
