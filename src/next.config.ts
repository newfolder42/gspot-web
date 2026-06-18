module.exports = {
  // Keep sharp's native binary out of the server bundle.
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gspot-uploads.s3.eu-central-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gspot-uploads-dev.s3.eu-central-1.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.gspot.ge',
          },
        ],
        destination: 'https://gspot.ge/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/games/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};
