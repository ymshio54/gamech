/** 記事の分類に使うプレーンテキスト（HTMLを除いた本文の先頭） */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalize(text: string): string {
  return text.normalize('NFKC').toUpperCase();
}

export function articleText(title: string, description = '', body = ''): string {
  return [title, description, body].filter((part) => part.trim()).join('\n');
}
