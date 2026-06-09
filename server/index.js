const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleApi, send, loadEnv } = require("./timeloop-api");

loadEnv();

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const port = Number(process.env.PORT || 3000);
const appOrigin = process.env.APP_ORIGIN || `http://localhost:${port}`;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".zip": "application/zip"
};

function serveStatic(req, res, pathname) {
  let target = pathname === "/" ? path.join(publicDir, "index.html") : path.join(publicDir, pathname);
  target = path.normalize(target);
  if (!target.startsWith(publicDir)) return send(res, 403, "Forbidden", "text/plain");
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    target = path.join(publicDir, "index.html");
  }
  const ext = path.extname(target);
  res.writeHead(200, {
    "Content-Type": mime[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300"
  });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, appOrigin);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url.pathname);
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`TimeLoop running at http://localhost:${port}`);
});
