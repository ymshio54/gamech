import type { Metadata } from 'next';
import BackToTop from '@/components/BackToTop';
import './globals.css';

const SITE_TITLE = 'げむch - ゲームセール・発売日・最新ニュース';
const SITE_DESCRIPTION =
  '4GamerやGame*SparkなどのRSSから、ゲームのセール情報・発売日・最新ニュースをまとめて表示します。';

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'ja_JP',
    type: 'website',
    siteName: 'げむch',
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
