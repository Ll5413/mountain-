/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除静态导出配置，使用标准部署模式
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};

module.exports = nextConfig;
