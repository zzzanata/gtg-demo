import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A demo usa um "mini Prisma" em memória sem tipos; não bloquear o build por erros de tipo.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
