import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tree-shaking yardımcısı — bu paketlerden yalnızca import edilen
  // sembolleri bundle'a alır. Lucide ve Recharts yüzlerce icon/component
  // export ediyor; default davranışta hepsi bundle'a girebilir.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'motion'],
  },
};

export default nextConfig;
