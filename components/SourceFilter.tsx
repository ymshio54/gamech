import Link from 'next/link';
import { FEED_SOURCES } from '@/lib/feeds';
import { buildHref, type QueryState } from '@/lib/query';

type Props = {
  query: QueryState;
};

export default function SourceFilter({ query }: Props) {
  return (
    <nav className="filter" aria-label="配信元で絞り込み">
      <Link href={buildHref({ ...query, source: undefined })} aria-current={query.source ? undefined : 'page'}>
        すべて
      </Link>
      {FEED_SOURCES.map((source) => (
        <Link
          key={source.id}
          href={buildHref({ ...query, source: source.id })}
          aria-current={query.source === source.id ? 'page' : undefined}
        >
          {source.name}
        </Link>
      ))}
    </nav>
  );
}
