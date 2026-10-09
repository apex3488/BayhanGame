// Serve ./out exactly like GitHub Pages would: under NEXT_PUBLIC_BASE_PATH, with trailing-slash directories.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const out = join(process.cwd(), "out");
const port = Number(process.env.PORT ?? 4173);
const raw = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "");
const basePath = !raw || raw === "/" ? "" : raw.startsWith("/") ? raw : `/${raw}`;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

if (!existsSync(out)) {
  console.error("out/ not found — run `npm run build` first.");
  process.exit(1);
}

function send(res, status, file) {
  res.writeHead(status, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  if (basePath && pathname === "/") {
    res.writeHead(302, { Location: `${basePath}/` });
    res.end();
    return;
  }
  if (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
    send(res, 404, join(out, "404.html"));
    return;
  }

  const local = normalize(join(out, pathname.slice(basePath.length)));
  if (local !== out && !local.startsWith(out + sep)) {
    res.writeHead(400).end();
    return;
  }

  if (existsSync(local) && statSync(local).isDirectory()) {
    if (!pathname.endsWith("/")) {
      res.writeHead(301, { Location: `${pathname}/` });
      res.end();
      return;
    }
    const index = join(local, "index.html");
    if (existsSync(index)) return send(res, 200, index);
  } else if (existsSync(local)) {
    return send(res, 200, local);
  }
  send(res, 404, join(out, "404.html"));
}).listen(port, () => {
  console.log(`Serving out/ at http://localhost:${port}${basePath}/`);
});
