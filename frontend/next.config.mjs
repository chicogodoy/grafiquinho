/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    // Em ambiente Vercel, o próprio vercel.json roteia /api/* para a função Python (api/index.py).
    // Localmente ou via Docker, o Next.js faz o proxy de /api/* para o container/processo FastAPI.
    if (process.env.VERCEL) {
      return [];
    }
    const backendUrl =
      process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
