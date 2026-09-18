const TOKYO = 'Asia/Tokyo';

export type Ymd = { year: number; month: number; day: number };

export type ExtractedDate = {
  ymd: Ymd;
  ms: number;
  delta: number;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function tokyoYmd(at = new Date()): Ymd {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TOKYO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: pick('year'), month: pick('month'), day: pick('day') };
}

/** 東京の暦日 0:00 を UTC ミリ秒にする */
export function tokyoMidnightMs(ymd: Ymd): number {
  return Date.parse(`${ymd.year}-${pad(ymd.month)}-${pad(ymd.day)}T00:00:00+09:00`);
}

export function addDays(ymd: Ymd, days: number): Ymd {
  const next = new Date(tokyoMidnightMs(ymd) + days * 24 * 60 * 60 * 1000);
  return tokyoYmd(next);
}

export function diffDays(from: Ymd, to: Ymd): number {
  return Math.round((tokyoMidnightMs(to) - tokyoMidnightMs(from)) / 86_400_000);
}

export function weekdayJa(ymd: Ymd): string {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: TOKYO, weekday: 'short' }).format(
    new Date(tokyoMidnightMs(ymd)),
  );
}

export function formatMonthDay(ymd: Ymd, today: Ymd): string {
  const year = ymd.year !== today.year ? `${ymd.year}年` : '';
  return `${year}${ymd.month}月${ymd.day}日（${weekdayJa(ymd)}）`;
}

export function inferYear(month: number, day: number, today: Ymd): number {
  let year = today.year;
  const candidate = { year, month, day };
  // 半年以上前なら翌年（「1月発売」を12月に読むとき）
  if (diffDays(today, candidate) < -180) year += 1;
  return year;
}

function ymdFromMatch(
  year: number,
  month: number,
  day: number,
  today: Ymd,
): ExtractedDate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const ymd = { year, month, day };
  return { ymd, ms: tokyoMidnightMs(ymd), delta: diffDays(today, ymd) };
}

/** 本文・タイトルから最初に出てくる日付を読む */
export function extractFirstDate(text: string, now = new Date()): ExtractedDate | null {
  const normalized = text.normalize('NFKC');
  const today = tokyoYmd(now);

  const withYear = normalized.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (withYear) {
    return ymdFromMatch(
      Number(withYear[1]),
      Number(withYear[2]),
      Number(withYear[3]),
      today,
    );
  }

  const monthDay = normalized.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (monthDay) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    return ymdFromMatch(inferYear(month, day, today), month, day, today);
  }

  const numeric = normalized.match(/(\d{4})[/.](\d{1,2})[/.](\d{1,2})/);
  if (numeric) {
    return ymdFromMatch(
      Number(numeric[1]),
      Number(numeric[2]),
      Number(numeric[3]),
      today,
    );
  }

  return null;
}
