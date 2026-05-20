import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = {
      ...(typeof config.resolve.alias === 'object' && config.resolve.alias !== null
        ? config.resolve.alias
        : {}),
      '@': __dirname,
    };
    return config;
  },
};

export default nextConfig;
