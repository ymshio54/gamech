const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatPublishedAt(isoDate: string | null): string {
  if (!isoDate) return '日時不明';
  return dateFormatter.format(new Date(isoDate));
}

/** 「3時間前」のような相対表記。24時間以上前は空文字を返す */
export function formatRelative(isoDate: string | null, now = Date.now()): string {
  if (!isoDate) return '';
  const diffMs = now - Date.parse(isoDate);
  if (diffMs < 0 || diffMs > 24 * 60 * 60 * 1000) return '';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  return `${Math.floor(minutes / 60)}時間前`;
}
