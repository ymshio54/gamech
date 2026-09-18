import Link from 'next/link';
import { buildHref, type QueryState } from '@/lib/query';

type Props = {
  query: QueryState;
};

export default function SearchBar({ query }: Props) {
  return (
    <form className="search" action="/" method="get" key={`${query.q ?? ''}-${query.source ?? ''}-${query.category ?? ''}`}>
      {query.source && <input type="hidden" name="source" value={query.source} />}
      {query.category && <input type="hidden" name="category" value={query.category} />}
      <label className="search-field">
        <span className="sr-only">キーワード検索</span>
        <input
          type="search"
          name="q"
          defaultValue={query.q ?? ''}
          placeholder="タイトルや本文を検索"
          autoComplete="off"
        />
      </label>
      <button type="submit">検索</button>
      {query.q && (
        <Link className="search-clear" href={buildHref({ ...query, q: undefined })}>
          クリア
        </Link>
      )}
    </form>
  );
}
