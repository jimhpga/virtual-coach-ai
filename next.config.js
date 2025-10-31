/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/',        destination: '/legacy/index.html' },
      { source: '/report',  destination: '/legacy/report.html' },
      { source: '/reports', destination: '/legacy/reports.html' },
      // /upload stays as your Next.js page
    ];
  },
};
module.exports = nextConfig;
