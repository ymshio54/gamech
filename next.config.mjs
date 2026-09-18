import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 上位ディレクトリのlockfileをワークスペースルートと誤検出させない
  outputFileTracingRoot: projectRoot,
  // dev中にビルドすると .next を奪い合って dev 側が壊れるため、出力先を分けられるようにする
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
