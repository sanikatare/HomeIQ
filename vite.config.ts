import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { handleApiRequest } from "./src/server/apiMiddleware.ts";

const rootDir = import.meta.dirname;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  if (env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }
  if (env.JWT_SECRET_KEY && !process.env.JWT_SECRET_KEY) {
    process.env.JWT_SECRET_KEY = env.JWT_SECRET_KEY;
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "homeiq-live-api-middleware",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            handleApiRequest(req, res, next).catch((err) => {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: String(err?.message || err),
                  },
                })
              );
            });
          });
        },
        configurePreviewServer(server) {
          server.middlewares.use((req, res, next) => {
            handleApiRequest(req, res, next).catch(next);
          });
        },
        closeBundle() {
          const srcAssets = path.resolve(rootDir, "src", "assets");
          const distAssets = path.resolve(rootDir, "dist", "src", "assets");
          if (fs.existsSync(srcAssets)) {
            fs.mkdirSync(path.dirname(distAssets), { recursive: true });
            fs.cpSync(srcAssets, distAssets, { recursive: true });
          }
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 1500,
    },
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "."),
      },
    },
    server: {
      port: 3000,
      host: "0.0.0.0",
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== "true",
    },
  };
});
