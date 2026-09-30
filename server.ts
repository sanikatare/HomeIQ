import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./src/server/apiMiddleware.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

function serveStaticFile(
  res: http.ServerResponse,
  filePath: string,
  isImmutableAsset = false
): boolean {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return false;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    if (isImmutableAsset) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (ext === ".html") {
      res.setHeader("Cache-Control", "no-cache");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  const distDir = path.resolve(__dirname, "dist");
  const hasBuiltDist = fs.existsSync(path.join(distDir, "index.html"));
  const isDevMode = process.env.NODE_ENV === "development" && !hasBuiltDist;

  if (isDevMode) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    const devServer = http.createServer((req, res) => {
      handleApiRequest(req, res, () => {
        vite.middlewares(req, res, () => {
          res.statusCode = 404;
          res.end("Not Found");
        });
      }).catch((err) => {
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

    devServer.listen(PORT, HOST, () => {
      console.log(`HomeIQ Dev Server listening on http://${HOST}:${PORT}`);
    });
    return;
  }

  const prodServer = http.createServer((req, res) => {
    handleApiRequest(req, res, () => {
      const rawUrl = req.url || "/";
      const parsedUrl = new URL(rawUrl, `http://${req.headers.host || "localhost"}`);
      const pathname = decodeURIComponent(parsedUrl.pathname);

      // 1. Serve direct /src/assets/* requests from workspace src/assets or dist/src/assets
      if (pathname.startsWith("/src/assets/")) {
        const relativeAsset = pathname.replace(/^\/+/, "");
        const workspaceAssetPath = path.resolve(__dirname, relativeAsset);
        if (
          workspaceAssetPath.startsWith(path.resolve(__dirname, "src", "assets")) &&
          serveStaticFile(res, workspaceAssetPath, true)
        ) {
          return;
        }
      }

      // 2. Serve built static files from dist/
      const cleanRelative = pathname.replace(/^\/+/, "");
      if (cleanRelative) {
        const distFilePath = path.resolve(distDir, cleanRelative);
        if (
          distFilePath.startsWith(distDir) &&
          serveStaticFile(
            res,
            distFilePath,
            pathname.startsWith("/assets/")
          )
        ) {
          return;
        }
      }

      // 3. SPA fallback -> dist/index.html
      const indexHtmlPath = path.join(distDir, "index.html");
      if (serveStaticFile(res, indexHtmlPath, false)) {
        return;
      }

      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: {
            code: "BUILD_ARTIFACTS_MISSING",
            message: "Run `npm run build` before starting the production server.",
          },
        })
      );
    }).catch((err) => {
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

  prodServer.listen(PORT, HOST, () => {
    console.log(`HomeIQ Production Server listening on http://${HOST}:${PORT}`);
  });
}

startServer();
