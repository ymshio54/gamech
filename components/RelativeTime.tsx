'use client';

import { useEffect, useState } from 'react';
import { formatRelative } from '@/lib/format';

/**
 * 「〇分前」はレンダリング時刻に依存するため、サーバーとクライアントで値がずれて
 * ハイドレーションエラーになる。マウント後にだけ描画し、1分ごとに更新する。
 */
export default function RelativeTime({ isoDate }: { isoDate: string | null }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const update = () => setLabel(formatRelative(isoDate));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [isoDate]);

  if (!label) return null;
  return <span className="relative">{label}</span>;
}
