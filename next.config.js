/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/upload", permanent: false },
    ];
  },
};

module.exports = nextConfig;
