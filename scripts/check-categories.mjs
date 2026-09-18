// カテゴリ判定の動作確認用スクリプト
// 使い方: node scripts/check-categories.mjs ["任意のタイトル" ...]
const RELEASE_PATTERN = /発売|リリース|配信開始|配信決定|配信日|配信へ|予約開始|予約受付|早期アクセス/;
const SALE_PATTERN =
  /セール|タイムセール|割引|値下げ|無料配布|無料配信|期間限定無料|(?<![A-Z])OFF(?![A-Z])|\d+\s*%\s*(OFF|オフ)|→\s*0円/;

const normalize = (text) => text.normalize('NFKC').toUpperCase().replace(/BASICプレイ無料|基本プレイ無料/g, '');

const classify = (title) => {
  const normalized = normalize(title);
  const hit = [];
  if (RELEASE_PATTERN.test(normalized)) hit.push('発売間近');
  if (SALE_PATTERN.test(normalized)) hit.push('セール情報');
  return hit;
};

const SAMPLES = [
  '【3,630円→0円】暴力FPS金字塔『DOOM Eternal』Amazonプライム会員向けに無料配布！',
  '最大85%OFFのTGSセールも開催中',
  '最大８５％ＯＦＦのセール',
  '10月1日よりSteam秋セール開催',
  'Diablo 5 - Official Teaser Trailer',
  'Steam Frame Review',
  'Playoff Championship Trailer',
  '基本プレイ無料で配信中',
  'Nintendo Switch 2向けに配信',
  '『ロマサガ3』の本気のリメイクは“思い出補正”すらも超えてきた',
  '10月13日発売の一人称視点ソウルライク『Valor Mortis』',
  'PS5向けに配信開始',
  '予約開始は来週',
  '正式リリース。新エリアを実装',
  '値下げを発表',
  '30% off for a limited time',
];

for (const title of [...SAMPLES, ...process.argv.slice(2)]) {
  const hit = classify(title);
  console.log(`${hit.length ? hit.join(' + ') : '(なし)'}\t${title}`);
}
