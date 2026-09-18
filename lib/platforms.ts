import { articleText, normalize } from './text';

export type HardwareId = 'ps5' | 'switch' | 'steam' | 'xbox';
export type PlatformId = HardwareId | 'multi';

export type Platform = {
  id: PlatformId;
  name: string;
};

export const HARDWARE_PLATFORMS: Platform[] = [
  { id: 'ps5', name: 'PS5' },
  { id: 'switch', name: 'Switch' },
  { id: 'steam', name: 'Steam/PC' },
  { id: 'xbox', name: 'Xbox' },
];

const MULTI: Platform = { id: 'multi', name: '全般・マルチ' };

/** ハード絞り込みタブの並び。末尾が機種名なし・複数機種の記事向け */
export const PLATFORMS: Platform[] = [...HARDWARE_PLATFORMS, MULTI];

/**
 * タイトルと概要だけを見る。明確な製品名以外は拾わない。
 * 英数字の前後が英数字なら一致させない（NPC / Official など）。
 */
const DETECT: Record<HardwareId, RegExp> = {
  ps5: /(?<![A-Z0-9])PS[45](?![A-Z0-9])|PLAYSTATION\s*[45]|プレステ\s*[45]|プレイステーション\s*[45]/,
  switch:
    /NINTENDO\s*SWITCH|ニンテンドー\s*スイッチ|(?<![A-Z0-9])SWITCH\s*2(?![A-Z0-9])|(?<![A-Z0-9])SWITCH(?![A-Z0-9])\s*(?:版|向け|対応|用)/,
  steam: /(?<![A-Z0-9])STEAM(?![A-Z0-9])/,
  xbox: /(?<![A-Z0-9])XBOX(?![A-Z0-9])/,
};

export function isPlatformId(value: string | undefined): value is PlatformId {
  return PLATFORMS.some((platform) => platform.id === value);
}

export function isHardwareId(value: string | undefined): value is HardwareId {
  return HARDWARE_PLATFORMS.some((platform) => platform.id === value);
}

type Classifiable = {
  title: string;
  description?: string;
  summary?: string;
};

/** タブ判定はタイトルと概要のみ。本文は関連リンクで誤爆しやすいので使わない。 */
function classificationText(article: Classifiable): string {
  return normalize(articleText(article.title, article.description));
}

function mentionedHardware(article: Classifiable): HardwareId[] {
  const text = classificationText(article);
  return HARDWARE_PLATFORMS.map((platform) => platform.id as HardwareId).filter((id) =>
    DETECT[id].test(text),
  );
}

/**
 * 確定できる機種だけ返す。0件または2機種以上なら空（全般・マルチ）。
 */
export function hardwareOf(article: Classifiable): Platform[] {
  const ids = mentionedHardware(article);
  if (ids.length !== 1) return [];
  return HARDWARE_PLATFORMS.filter((platform) => platform.id === ids[0]);
}

export function platformsOf(article: Classifiable): Platform[] {
  const found = hardwareOf(article);
  return found.length > 0 ? found : [MULTI];
}

export function matchesPlatform(article: Classifiable, platformId: PlatformId): boolean {
  const ids = mentionedHardware(article);
  if (platformId === 'multi') return ids.length !== 1;
  return ids.length === 1 && ids[0] === platformId;
}
