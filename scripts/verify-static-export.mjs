// Sanity checks for the GitHub Pages build: run after `next build`.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const out = join(root, "out");
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const errors = [];

function normalizeBasePath(value) {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

if (!existsSync(join(out, "index.html"))) {
  console.error("✖ out/index.html not found — run `npm run build` first.");
  process.exit(1);
}

for (const route of [
  "games", "games/mines", "games/updown", "games/slots",
  "store", "leaderboard", "profile", "tasks", "settings",
  "city", "city/jobs", "city/bank", "city/shop", "city/realty", "city/cars",
  "city/business", "city/assets", "city/cases", "city/resources",
  "city/vip", "city/donate", "city/promo", "city/referrals", "city/corp",
  "city/marriage", "city/events", "city/help",
]) {
  if (!existsSync(join(out, route, "index.html"))) errors.push(`missing route: /${route}/`);
}
if (!existsSync(join(out, "404.html"))) errors.push("missing 404.html");
if (!existsSync(join(out, ".nojekyll"))) errors.push("missing .nojekyll (GitHub Pages would hide /_next)");

for (const forbidden of ["app/api", "pages/api"]) {
  if (existsSync(join(root, forbidden))) errors.push(`server routes are not allowed in a static export: ${forbidden}`);
}
for (const name of ["middleware.ts", "middleware.js", "proxy.ts", "proxy.js"]) {
  if (existsSync(join(root, name))) errors.push(`${name} is not supported by GitHub Pages`);
}
for (const file of walk(join(root, "app"))) {
  if (/[\\/]route\.(ts|tsx|js)$/.test(file)) errors.push(`route handler found: ${relative(root, file)}`);
}

const htmlFiles = walk(out).filter((file) => file.endsWith(".html"));
const assetRef = /(?:src|href)="(\/[^"]*_next\/[^"]*)"/g;
let checkedRefs = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(assetRef)) {
    checkedRefs += 1;
    const url = match[1];
    if (!url.startsWith(`${basePath}/_next/`)) {
      errors.push(`${relative(out, file)}: asset "${url}" is not under base path "${basePath || "/"}"`);
      break;
    }
  }
}

const secretPatterns = [
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "Telegram bot token", re: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/ },
];
const blockedApiHosts = ["trycloudflare.com", "ngrok-free.app", "ngrok.io"];
let sawSupabaseApi = false;
for (const file of walk(out).filter((path) => /\.(js|html)$/.test(path))) {
  const content = readFileSync(file, "utf8");
  for (const { name, re } of secretPatterns) {
    if (re.test(content)) errors.push(`${relative(out, file)}: looks like it contains a ${name}`);
  }
  for (const host of blockedApiHosts) {
    if (content.includes(host)) {
      errors.push(`${relative(out, file)}: baked dead tunnel host "${host}" — login will fail`);
      break;
    }
  }
  if (content.includes("supabase.co/functions")) sawSupabaseApi = true;
}
const expectedApi = (process.env.NEXT_PUBLIC_GAME_API_URL ?? "").trim();
if (expectedApi && !expectedApi.includes("supabase.co/functions")) {
  errors.push(`NEXT_PUBLIC_GAME_API_URL must be a Supabase Edge Function URL, got: ${expectedApi}`);
}
if (!sawSupabaseApi) {
  errors.push("built assets do not contain a supabase.co/functions API URL — login will fail on Pages/Telegram");
}

if (errors.length > 0) {
  console.error("✖ Static export verification failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`✔ Static export OK — ${htmlFiles.length} HTML files, ${checkedRefs} asset refs under "${basePath || "/"}".`);
