import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode !== "development" && VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["marine-logo.png"],
      manifest: {
        name: "Sistema de Gerenciamento - Gestão de Seguros",
        short_name: "Sistema Seguros",
        description: "Sistema completo para gestão de seguros",
        theme_color: "#1e293b",
        background_color: "#0f172a",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/marine-logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/marine-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 // 3 MB
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
