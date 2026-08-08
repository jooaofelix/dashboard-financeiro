import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * O app é inteiramente client-side: não há rotas de API, server actions,
   * cookies nem imagens otimizadas — as 11 rotas já saíam como estáticas.
   * Exportar como site estático dispensa um servidor Node em produção e permite
   * servir tudo como assets (Cloudflare, S3, qualquer CDN).
   *
   * Sem isso, um host que espera um servidor Next (como um Worker do
   * Cloudflare) não tem o que executar e responde "Internal Server Error".
   */
  output: "export",
};

export default nextConfig;
