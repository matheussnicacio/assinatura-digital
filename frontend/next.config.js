// Exportação estática: o resultado (pasta "out") é publicável no GitHub Pages (HTTPS/TLS automático).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

module.exports = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};
