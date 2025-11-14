import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configuração para pdfjs-dist
    if (!isServer) {
      // Desabilita canvas no cliente (pdfjs-dist usa worker)
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
      
      // Configura para processar arquivos .mjs do pdfjs-dist
      config.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto",
        resolve: {
          fullySpecified: false,
        },
      });
      
      // Configura para não fazer code splitting do pdfjs-dist
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            pdfjs: {
              test: /[\\/]node_modules[\\/]pdfjs-dist[\\/]/,
              name: "pdfjs",
              chunks: "all",
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },
  // Configuração para servir arquivos .mjs corretamente
  headers: async () => {
    return [
      {
        source: "/pdf-js/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
