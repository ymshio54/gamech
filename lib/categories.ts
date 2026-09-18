import { normalize } from './text';

export type CategoryId = 'release' | 'sale';

export type Category = {
  id: CategoryId;
  name: string;
};

/** タブの並び。判定キーワードは下の正規表現。 */
export const CATEGORIES: Category[] = [
  { id: 'release', name: '発売間近' },
  { id: 'sale', name: 'セール情報' },
];

/**
 * タイトル向け。単独の「配信」は番組配信などにも当たるので使わない。
 * 「基本プレイ無料」はセールにしない。
 */
const TITLE_RELEASE = /発売|リリース|配信開始|配信決定|配信日|配信へ|予約開始|予約受付|早期アクセス/;
/** 本文は関連記事の日付に引っ張られやすいので、発売表現の近くだけ見る */
const BODY_RELEASE =
  /(\d{1,2}\s*月\s*\d{1,2}\s*日.{0,12}(発売|配信開始|配信へ|リリース|予約開始)|配信開始|予約開始|近日発売)/;
const TITLE_SALE =
  /セール|タイムセール|割引|値下げ|無料配布|無料配信|期間限定無料|(?<![A-Z])OFF(?![A-Z])|\d+\s*%\s*(OFF|オフ)|→\s*0円|0円\]|0円）/;
const BODY_SALE =
  /セール|無料配布|無料配信|\d+\s*%\s*(OFF|オフ)|(?<![A-Z])OFF(?![A-Z])|→\s*0円/;

function withoutFreeToPlay(text: string): string {
  return normalize(text).replace(/BASICプレイ無料|基本プレイ無料/g, '');
}

export function isReleaseText(title: string, summary = '', description = ''): boolean {
  if (TITLE_RELEASE.test(withoutFreeToPlay(title))) return true;
  return BODY_RELEASE.test(withoutFreeToPlay(`${description}\n${summary}`));
}

export function isSaleText(title: string, summary = '', description = ''): boolean {
  if (TITLE_SALE.test(withoutFreeToPlay(title))) return true;
  return BODY_SALE.test(withoutFreeToPlay(`${description}\n${summary}`));
}

export function matchesCategory(
  article: { title: string; summary?: string; description?: string },
  categoryId: CategoryId,
): boolean {
  return categoryId === 'release'
    ? isReleaseText(article.title, article.summary, article.description)
    : isSaleText(article.title, article.summary, article.description);
}

export function categoriesOf(article: { title: string; summary?: string; description?: string }): Category[] {
  return CATEGORIES.filter((category) => matchesCategory(article, category.id));
}

export function isCategoryId(value: string | undefined): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}
