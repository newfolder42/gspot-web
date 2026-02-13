module.exports = {
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
  env: {
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
  },
};
