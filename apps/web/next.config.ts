
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/health',
        destination: 'https://paas-k7nx.onrender.com/health',
      },
      {
        source: '/api/:path*',
        destination: 'https://paas-k7nx.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
