import Link from 'next/link';
import { PLATFORMS, type PlatformId } from '@/lib/platforms';
import { buildHref, type QueryState } from '@/lib/query';

type Props = {
  query: QueryState;
  counts: Record<'all' | PlatformId, number>;
};

export default function PlatformFilter({ query, counts }: Props) {
  return (
    <nav className="filter filter--platforms" aria-label="ハードで絞り込み">
      <Link href={buildHref({ ...query, platform: undefined })} aria-current={query.platform ? undefined : 'page'}>
        すべて
        <span className="count">{counts.all}</span>
      </Link>
      {PLATFORMS.map((platform) => (
        <Link
          key={platform.id}
          href={buildHref({ ...query, platform: platform.id })}
          aria-current={query.platform === platform.id ? 'page' : undefined}
        >
          {platform.name}
          <span className="count">{counts[platform.id]}</span>
        </Link>
      ))}
    </nav>
  );
}
