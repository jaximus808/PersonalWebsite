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
  compress:true,
	webpack(config, { dev }) {
		if(dev) {
			config.devtool = 'react_devtools_backend_compact'
		}
		return config;
	}
}

module.exports = nextConfig
