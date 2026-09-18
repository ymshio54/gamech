import type { CategoryId } from '@/lib/categories';

/** 画面の絞り込み条件。タブや検索を切り替えても他の条件を保つ。 */
export type QueryState = {
  source?: string;
  category?: CategoryId;
  q?: string;
};

export function buildHref(params: QueryState): string {
  const search = new URLSearchParams();
  if (params.source) search.set('source', params.source);
  if (params.category) search.set('category', params.category);
  if (params.q) search.set('q', params.q);
  const query = search.toString();
  return query ? `/?${query}` : '/';
}
