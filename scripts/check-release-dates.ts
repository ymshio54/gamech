import { parseReleaseHint } from '../lib/releaseDate.ts';
import { parseSaleHint } from '../lib/saleStatus.ts';

const now = new Date('2026-09-18T12:00:00+09:00');

const releaseSamples = [
  '『ゴールデンカムイ ヒグマのスープ』12月25日に発売',
  '10月13日発売の一人称視点ソウルライク『Valor Mortis』',
  'PC・スマホで10月7日リリースへ',
  '9月24日のリリースが迫る「CONTROL Resonant」',
  '本日発売の新作をチェック',
  '今週発売の新作ゲーム『Valheim』他',
  '発売迫る『CONTROL Resonant』ローンチトレイラー',
  '予約開始は10月1日',
  'Nintendo Switch 2向けに配信',
  '最大85%OFFのTGSセールも開催中',
  '2026年1月28日発売決定',
  {
    title: '新作アクションが発表',
    summary: 'PlayStation 5向けに10月2日発売。予約開始は本日より。',
  },
];

console.log('--- 発売日 ---');
for (const sample of [...releaseSamples, ...process.argv.slice(2)]) {
  const hint = parseReleaseHint(sample, now);
  const title = typeof sample === 'string' ? sample : `${sample.title} / ${sample.summary}`;
  console.log(`${hint ? `${hint.bucket}\t${hint.label}` : '(なし)'}\t${title}`);
}

const saleSamples = [
  '最大85%OFFのTGSセールも開催中',
  '10月1日よりSteam秋セール開催',
  '週末限定セールは9月21日まで',
  '期間限定で無料配布中',
  '来週から割引キャンペーン開催予定',
  '基本プレイ無料で配信中',
];

console.log('--- セール ---');
for (const sample of saleSamples) {
  const hint = parseSaleHint(sample, now);
  console.log(`${hint.phase}\t${hint.label}\t${sample}`);
}
