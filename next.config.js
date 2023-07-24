/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'drive.google.com',
    //     port: '',
    //   },
    // ],
    domains:['drive.google.com','cdn.discordapp.com']
  },
}

module.exports = nextConfig
