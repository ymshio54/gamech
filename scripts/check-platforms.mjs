// ハード判定の動作確認用
// 使い方: node scripts/check-platforms.mjs ["任意のタイトル" ...]
const DETECT = {
  ps5: /(?<![A-Z0-9])PS[45](?![A-Z0-9])|PLAYSTATION\s*[45]|プレステ\s*[45]|プレイステーション\s*[45]/,
  switch:
    /NINTENDO\s*SWITCH|ニンテンドー\s*スイッチ|(?<![A-Z0-9])SWITCH\s*2(?![A-Z0-9])|(?<![A-Z0-9])SWITCH(?![A-Z0-9])\s*(?:版|向け|対応|用)/,
  steam: /(?<![A-Z0-9])STEAM(?![A-Z0-9])/,
  xbox: /(?<![A-Z0-9])XBOX(?![A-Z0-9])/,
};

const names = { ps5: 'PS5', switch: 'Switch', steam: 'Steam/PC', xbox: 'Xbox' };

const classify = (title, description = '') => {
  const text = `${title}\n${description}`.normalize('NFKC').toUpperCase();
  const hit = Object.entries(DETECT)
    .filter(([, pattern]) => pattern.test(text))
    .map(([id]) => names[id]);
  if (hit.length !== 1) return '全般・マルチ';
  return hit[0];
};

const SAMPLES = [
  ['PS5版が本日発売', ''],
  ['PlayStation 5 / PlayStation5 対応', ''],
  ['プレステ5でも遊べる', ''],
  ['PS4版のセール開催中', ''],
  ['Nintendo Switch向けに配信', ''],
  ['NintendoSwitch版が登場', ''],
  ['スイッチを押して進むパズル', ''],
  ['スイッチ版も同時発売', ''],
  ['Steamで配信開始', ''],
  ['PC版がWindows向けに登場', ''],
  ['NPCの会話が増えるアップデート', ''],
  ['Xbox Series X|S対応', ''],
  ['Series S向けの最適化', ''],
  ['PS5/Switch向けに発売', ''],
  ['Switch2/PS5版を本日発売', ''],
  ['業界全体の話題', ''],
  ['Diablo 5 - Official Teaser', ''],
];

for (const [title, description] of [...SAMPLES, ...process.argv.slice(2).map((title) => [title, ''])]) {
  console.log(`${classify(title, description)}\t${title}${description ? ` / ${description}` : ''}`);
}
