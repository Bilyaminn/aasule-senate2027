#!/usr/bin/env node
// Fills in the website's public address in the share tags, canonical links, sitemap and robots.txt.
//   Local / any host:   node tools/set-site-url.mjs https://your-domain.com
//   On Vercel:          runs automatically (vercel.json "buildCommand"); uses SITE_URL if you set it,
//                       otherwise Vercel's production domain (VERCEL_PROJECT_PRODUCTION_URL).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const TOKEN = '__SITE_URL__';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let origin = process.argv[2] || process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '');
origin = origin.trim().replace(/\/+$/, '');
if (origin && !/^https?:\/\//i.test(origin)) origin = 'https://' + origin;
const files = fs.readdirSync(root).filter(f => /\.(html|xml|txt)$/i.test(f)).map(f => path.join(root, f));
let changed = 0;
for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(TOKEN)) continue;
  if (origin) text = text.split(TOKEN).join(origin);
  else if (process.env.VERCEL) text = text.split('\n').filter(line => !line.includes(TOKEN)).join('\n'); // never publish placeholders
  else continue;
  fs.writeFileSync(file, text); changed++;
}
if (!origin && !process.env.VERCEL) console.warn('No address given. Run: node tools/set-site-url.mjs https://your-domain.com');
else if (!origin) { try { fs.unlinkSync(path.join(root, 'sitemap.xml')); } catch {} console.warn('No production domain available: share tags were left out. Set SITE_URL in Vercel.'); }
else console.log(`Site address set to ${origin} in ${changed} file(s).`);
