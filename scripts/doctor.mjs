#!/usr/bin/env node
/**
 * One-command health check for BAYHAN GAME Mini App wiring.
 * Never prints tokens, keys, or Telegram initData.
 *
 * Usage: npm run doctor
 * Optional: EXPECTED_API_URL=https://xxx.trycloudflare.com npm run doctor
 */

import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const PAGES_URL = "https://apex3488.github.io/BayhanGame/";
const LOCAL_API = "http://127.0.0.1:8000";
const APEX_DIR = join(ROOT, "..", "apex game");

const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`✔ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
  console.log(`✖ ${name}${detail ? ` — ${detail}` : ""}`);
}

function info(msg) {
  console.log(`  ${msg}`);
}

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function request(url, { method = "GET", headers = {}, timeoutMs = 12_000 } = {}) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.request(
      url,
      { method, headers, timeout: timeoutMs, rejectUnauthorized: true },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () =>
          resolve({
            ok: true,
            status: res.statusCode ?? 0,
            body,
            headers: res.headers,
          }),
        );
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    req.on("error", (e) => resolve({ ok: false, error: e.message }));
    req.end();
  });
}

function portListening(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count"`,
        { encoding: "utf8" },
      ).trim();
      return Number(out) > 0;
    }
  } catch {
    /* fall through */
  }
  return null;
}

async function extractBakedApiUrl() {
  const page = await request(PAGES_URL);
  if (!page.ok || page.status !== 200) return { error: page.error || `HTTP ${page.status}` };
  const jsPaths = [...page.body.matchAll(/\/BayhanGame\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]);
  const tunnels = new Set();
  for (const path of jsPaths) {
    const chunk = await request(`https://apex3488.github.io${path}`);
    if (!chunk.ok) continue;
    for (const m of chunk.body.matchAll(/https?:\/\/[A-Za-z0-9.-]+\.trycloudflare\.com/g)) {
      tunnels.add(m[0]);
    }
  }
  return { tunnels: [...tunnels], hasNext: /_next\/static/.test(page.body) };
}

async function main() {
  console.log("\nBAYHAN GAME doctor\n");

  const env = loadEnvLocal();
  const expected =
    (process.env.EXPECTED_API_URL || "").trim().replace(/\/+$/, "") ||
    (env.NEXT_PUBLIC_GAME_API_URL || "").trim().replace(/\/+$/, "");

  // 1) Local API port / health
  const listening = portListening(8000);
  if (listening === true) pass("Local API port 8000", "listen");
  else if (listening === false) fail("Local API port 8000", "nothing listening");
  else info("(port check skipped)");

  const localHealth = await request(`${LOCAL_API}/health`);
  if (localHealth.ok && localHealth.status === 200 && /"status"\s*:\s*"ok"/.test(localHealth.body)) {
    pass("Local /health", "200");
  } else {
    fail("Local /health", localHealth.error || `HTTP ${localHealth.status}`);
  }

  const localMe = await request(`${LOCAL_API}/api/me`);
  if (localMe.ok && localMe.status === 401) pass("Local /api/me without auth", "401 (expected)");
  else fail("Local /api/me without auth", localMe.error || `HTTP ${localMe.status} (want 401)`);

  // 2) Published Pages + baked URL
  const baked = await extractBakedApiUrl();
  if (baked.error) fail("GitHub Pages app", baked.error);
  else if (!baked.hasNext) fail("GitHub Pages app", "looks like README / no Next assets");
  else pass("GitHub Pages app", "Next static export");

  const bakedUrl = baked.tunnels?.[0] ?? null;
  if (baked.tunnels?.length) {
    pass("API URL baked into Pages", baked.tunnels.join(", "));
  } else {
    fail("API URL baked into Pages", "no trycloudflare / API host found in JS");
  }

  if (expected) {
    if (baked.tunnels?.includes(expected)) pass("Pages URL matches EXPECTED/local", expected);
    else fail("Pages URL matches EXPECTED/local", `baked≠${expected}`);
  } else {
    info("Set NEXT_PUBLIC_GAME_API_URL in .env.local or EXPECTED_API_URL to compare.");
  }

  // 3) Public health + CORS + me for baked URL (or expected)
  const publicBase = expected || bakedUrl;
  if (publicBase) {
    const pubHealth = await request(`${publicBase}/health`);
    if (pubHealth.ok && pubHealth.status === 200 && /"status"\s*:\s*"ok"/.test(pubHealth.body)) {
      pass("Public /health", publicBase);
    } else {
      fail("Public /health", pubHealth.error || `HTTP ${pubHealth.status}`);
    }

    const cors = await request(`${publicBase}/api/me`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://apex3488.github.io",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "x-telegram-init-data",
      },
    });
    const allowOrigin = cors.headers?.["access-control-allow-origin"];
    const allowHeaders = String(cors.headers?.["access-control-allow-headers"] || "");
    if (
      cors.ok &&
      cors.status >= 200 &&
      cors.status < 400 &&
      allowOrigin === "https://apex3488.github.io" &&
      /x-telegram-init-data/i.test(allowHeaders)
    ) {
      pass("CORS preflight for Pages", "origin + initData header");
    } else {
      fail(
        "CORS preflight for Pages",
        cors.error || `status=${cors.status} origin=${allowOrigin ?? "none"}`,
      );
    }

    const pubMe = await request(`${publicBase}/api/me`, {
      headers: { Origin: "https://apex3488.github.io", Accept: "application/json" },
    });
    if (pubMe.ok && pubMe.status === 401) pass("Public /api/me without auth", "401 (expected)");
    else fail("Public /api/me without auth", pubMe.error || `HTTP ${pubMe.status} (want 401)`);
  } else {
    fail("Public API checks", "no public base URL available");
  }

  // 4) Frontend config sanity
  const ds = (env.NEXT_PUBLIC_DATA_SOURCE || "demo").toLowerCase();
  if (ds === "api") pass("Local DATA_SOURCE", "api");
  else fail("Local DATA_SOURCE", `${ds} (want api for live bot data)`);

  if ((env.NEXT_PUBLIC_GAME_API_URL || "").trim()) pass("Local GAME_API_URL set", new URL(env.NEXT_PUBLIC_GAME_API_URL).host);
  else fail("Local GAME_API_URL set", "empty in .env.local");

  // 5) Apex game folder presence (no second start)
  if (existsSync(join(APEX_DIR, "miniapp_api", "main.py"))) pass("Apex game API sources", APEX_DIR);
  else fail("Apex game API sources", `not found at ${APEX_DIR}`);

  const failed = results.filter((r) => !r.ok);
  console.log("");
  if (failed.length === 0) {
    console.log("ALL CHECKS PASSED");
    console.log("Open Mini App in Telegram → home balance should show real USD from the bot DB.");
    console.log("If balance still fails only inside Telegram, send /start to the bot once, then reopen the app.");
  } else {
    console.log(`FAILED: ${failed.length}/${results.length}`);
    const first = failed[0];
    console.log("\nONE ACTION:");
    if (first.name.startsWith("Local /health") || first.name.includes("port 8000")) {
      console.log(
        `Start API once (if not running):\n  cd "${APEX_DIR}"\n  .\\.venv\\Scripts\\activate\n  uvicorn miniapp_api.main:app --host 127.0.0.1 --port 8000`,
      );
    } else if (first.name.startsWith("Public /health")) {
      console.log(
        "Start / refresh Cloudflare Quick Tunnel to http://127.0.0.1:8000, then set GitHub Actions variable NEXT_PUBLIC_GAME_API_URL to the new https://….trycloudflare.com and re-run Deploy to GitHub Pages.",
      );
    } else if (first.name.includes("Pages URL matches") || first.name.includes("baked into Pages")) {
      console.log(
        "In GitHub → Settings → Secrets and variables → Actions → Variables set NEXT_PUBLIC_GAME_API_URL to the LIVE tunnel URL, then re-run workflow Deploy to GitHub Pages.",
      );
    } else if (first.name.includes("GAME_API_URL")) {
      console.log("Put the LIVE tunnel URL into .env.local as NEXT_PUBLIC_GAME_API_URL=https://….trycloudflare.com");
    } else {
      console.log(`Fix: ${first.name} — ${first.detail}`);
    }
  }
  console.log("");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
