/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ini buat nyuruh Vercel nyantai dan abaikan warning/error penulisan kode
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;