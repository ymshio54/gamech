import RelativeTime from '@/components/RelativeTime';
import { categoriesOf } from '@/lib/categories';
import type { Article } from '@/lib/feeds';
import { formatPublishedAt } from '@/lib/format';
import type { ReleaseHint } from '@/lib/releaseDate';
import type { SaleHint } from '@/lib/saleStatus';
import { storeLinksOf, xShareHref } from '@/lib/storeLinks';

type Props = {
  article: Article;
  release?: ReleaseHint | null;
  sale?: SaleHint | null;
};

export default function ArticleCard({ article, release = null, sale = null }: Props) {
  const fallbackTags = categoriesOf(article);
  const tags = [
    ...(release
      ? [{ id: `release-${release.bucket}`, className: `tag--release tag--${release.bucket}`, label: release.label }]
      : []),
    ...(sale
      ? [{ id: `sale-${sale.phase}`, className: `tag--sale tag--${sale.phase}`, label: sale.label }]
      : []),
  ];
  const overlayTags =
    tags.length > 0
      ? tags
      : fallbackTags.map((category) => ({
          id: category.id,
          className: `tag--${category.id}`,
          label: category.name,
        }));
  const showStore = Boolean(release || sale);
  const storeLinks = showStore ? storeLinksOf(article) : [];
  const shareHref = xShareHref(article.title, article.link);

  return (
    <article className="card">
      <a className="thumb" href={article.link} target="_blank" rel="noopener noreferrer" tabIndex={-1}>
        {article.thumbnail ? (
          /* 配信元のドメインが多岐にわたるため next/image ではなく img を使う */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={article.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="placeholder">NO IMAGE</div>
        )}
        {overlayTags.length > 0 && (
          <div className="tags">
            {overlayTags.map((tag) => (
              <span key={tag.id} className={`tag ${tag.className}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </a>
      <div className="body">
        <a className="card-main" href={article.link} target="_blank" rel="noopener noreferrer">
          <div className="meta-row">
            <span className="source">{article.sourceName}</span>
            {(release || sale) && (
              <div className="badges">
                {release && <span className={`when when--${release.bucket}`}>{release.label}</span>}
                {sale && <span className={`when when--${sale.phase}`}>{sale.label}</span>}
              </div>
            )}
          </div>
          <h2>{article.title}</h2>
        </a>
        {storeLinks.length > 0 && (
          <div className="store-row">
            {storeLinks.map((link) => (
              <a
                key={link.id}
                className="store-btn"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
        <div className="card-foot">
          <time dateTime={article.publishedAt ?? undefined}>
            {formatPublishedAt(article.publishedAt)}
            <RelativeTime isoDate={article.publishedAt} />
          </time>
          <a className="share" href={shareHref} target="_blank" rel="noopener noreferrer">
            <XIcon />
            Xで共有
          </a>
        </div>
      </div>
    </article>
  );
}

function XIcon() {
  return (
    <svg className="share-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.6.75h2.45l-5.36 6.13L16 15.25h-4.94L7.4 10.18 3.01 15.25H.55l5.73-6.55L0 .75h5.06l3.52 4.65L12.6.75Zm-.86 13.03h1.36L4.32 2.14H2.86l8.88 11.64Z"
      />
    </svg>
  );
}
