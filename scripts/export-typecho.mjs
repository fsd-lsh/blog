#!/usr/bin/env node
/**
 * Export Typecho MySQL data to Astro content collections.
 */
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');

function loadEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnv(path.join(ROOT, '.env.local'));
loadEnv(path.join(ROOT, '.env'));

const cfg = {
  host: process.env.TYPECHO_DB_HOST || '127.0.0.1',
  port: Number(process.env.TYPECHO_DB_PORT || 3306),
  user: process.env.TYPECHO_DB_USER || 'root',
  password: process.env.TYPECHO_DB_PASSWORD || '',
  database: process.env.TYPECHO_DB_NAME || 'typecho',
  prefix: process.env.TYPECHO_DB_PREFIX || 'typecho_',
  siteUrl: (process.env.TYPECHO_SITE_URL || 'https://www.easybhu.cn').replace(/\/$/, ''),
};

const POSTS_DIR = path.join(ROOT, 'src/content/posts');
const PAGES_DIR = path.join(ROOT, 'src/content/pages');
const PUBLIC_UPLOADS = path.join(ROOT, 'public/uploads');
const PUBLIC_THEME = path.join(ROOT, 'public/theme');
const META_PATH = path.join(ROOT, 'src/data/site-meta.json');
const REPORT_PATH = path.join(ROOT, 'migration-report.json');

const PAGE_TEMPLATE_MAP = {
  link: 'links',
  cubes: 'tools',
  'thumbs-down': 'threat',
  'info-circle': 'default',
  'sub-site': 'default',
};

const SKIP_PAGE_SLUGS = new Set(['thumbs-down', 'threat', 'sub-site']);

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});
turndown.use(gfm);

function phpUnserialize(serialized) {
  if (!serialized) return {};
  try {
    const out = execSync(
      `php -r 'echo json_encode(unserialize(file_get_contents("php://stdin")));'`,
      {
        input: serialized,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return JSON.parse(out.trim() || '{}');
  } catch {
    return {};
  }
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(text, len = 120) {
  const plain = stripHtml(text);
  if (plain.length <= len) return plain;
  return `${plain.slice(0, len)} ...`;
}

async function ensureDir(dir) {
  await fsPromises.mkdir(dir, { recursive: true });
}

async function emptyDir(dir) {
  await fsPromises.rm(dir, { recursive: true, force: true });
  await fsPromises.mkdir(dir, { recursive: true });
}

async function copyThemeAssets() {
  const srcTheme = path.join(REPO_ROOT, 'usr/themes/tl');
  await ensureDir(PUBLIC_THEME);
  for (const sub of ['css', 'images', 'js', 'fonts']) {
    const from = path.join(srcTheme, sub);
    const to = path.join(PUBLIC_THEME, sub);
    await fsPromises.cp(from, to, { recursive: true, force: true });
  }
  await fsPromises.copyFile(
    path.join(srcTheme, 'favicon.ico'),
    path.join(ROOT, 'public/favicon.ico'),
  );
}

async function resolveLocalAsset(urlPath) {
  if (!urlPath || !urlPath.startsWith('/')) return null;
  const local = path.join(REPO_ROOT, urlPath.replace(/^\//, ''));
  try {
    await fsPromises.access(local);
    return local;
  } catch {
    return null;
  }
}

async function downloadOrCopyAsset(src, destRelPath) {
  const destAbs = path.join(ROOT, 'public', destRelPath);
  await ensureDir(path.dirname(destAbs));
  const local = await resolveLocalAsset(src);
  if (local) {
    await fsPromises.copyFile(local, destAbs);
    return `/${destRelPath.replace(/\\/g, '/')}`;
  }
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const res = await fetch(src);
      if (!res.ok) return src;
      const buf = Buffer.from(await res.arrayBuffer());
      await fsPromises.writeFile(destAbs, buf);
      return `/${destRelPath.replace(/\\/g, '/')}`;
    } catch {
      return src;
    }
  }
  if (src.startsWith('/')) {
    try {
      const res = await fetch(`${cfg.siteUrl}${src}`);
      if (!res.ok) return src;
      const buf = Buffer.from(await res.arrayBuffer());
      await fsPromises.writeFile(destAbs, buf);
      return `/${destRelPath.replace(/\\/g, '/')}`;
    } catch {
      return src;
    }
  }
  return src;
}

async function processImages(html, cid, report) {
  let result = html;
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const replacements = [];
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    replacements.push(m[1]);
  }

  for (const src of [...new Set(replacements)]) {
    if (!src || src.startsWith('data:')) continue;
    const fileName = path.basename(src.split('?')[0]) || `img-${cid}.png`;
    const destRel = `uploads/${cid}/${fileName}`;
    const newUrl = await downloadOrCopyAsset(src, destRel);
    if (newUrl === src && !src.startsWith('http')) {
      report.missingImages.push({ cid, src });
    }
    result = result.split(src).join(newUrl);
  }
  return result;
}

function yamlEscape(str) {
  return `"${String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function toFrontmatter(data) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${k}: []`);
      } else {
        lines.push(`${k}:`);
        for (const item of v) lines.push(`  - ${yamlEscape(item)}`);
      }
    } else if (typeof v === 'boolean') {
      lines.push(`${k}: ${v}`);
    } else if (typeof v === 'number') {
      lines.push(`${k}: ${v}`);
    } else {
      lines.push(`${k}: ${yamlEscape(v)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

async function getMetas(conn, cid) {
  const [rows] = await conn.query(
    `SELECT m.type, m.name, m.slug FROM ${cfg.prefix}relationships r
     JOIN ${cfg.prefix}metas m ON r.mid = m.mid
     WHERE r.cid = ?`,
    [cid],
  );
  const categories = [];
  const tags = [];
  for (const row of rows) {
    if (row.type === 'category') categories.push(row.name);
    if (row.type === 'tag') tags.push(row.name);
  }
  return { categories, tags };
}

async function main() {
  const report = {
    exportedAt: new Date().toISOString(),
    posts: { success: 0, failed: 0 },
    pages: { success: 0, skipped: 0, failed: 0 },
    missingImages: [],
    errors: [],
  };

  console.log('Connecting to MySQL...', cfg.host, cfg.database);
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    charset: 'utf8mb4',
  });

  const [optRows] = await conn.query(
    `SELECT name, value FROM ${cfg.prefix}options WHERE name IN ('siteUrl','title','theme:tl')`,
  );
  const options = Object.fromEntries(optRows.map((r) => [r.name, r.value]));
  const theme = phpUnserialize(options['theme:tl'] || '');
  const siteUrl = (options.siteUrl || cfg.siteUrl).replace(/\/$/, '');
  const siteTitle = options.title || "Sihan's Blog";

  console.log('Copying theme assets...');
  await copyThemeAssets();
  await emptyDir(POSTS_DIR);
  await emptyDir(PAGES_DIR);
  await ensureDir(PUBLIC_UPLOADS);

  const [categories] = await conn.query(
    `SELECT name, slug, count FROM ${cfg.prefix}metas WHERE type='category' ORDER BY \`order\``,
  );
  const [tags] = await conn.query(
    `SELECT name, slug, count FROM ${cfg.prefix}metas WHERE type='tag' AND count > 0 ORDER BY count DESC LIMIT 30`,
  );

  const [posts] = await conn.query(
    `SELECT cid, title, slug, text, created, modified, status
     FROM ${cfg.prefix}contents
     WHERE type='post' AND status='publish'
     ORDER BY created DESC`,
  );

  console.log(`Exporting ${posts.length} posts...`);
  for (const post of posts) {
    try {
      const { categories: cats, tags: postTags } = await getMetas(conn, post.cid);
      let html = post.text || '';
      html = await processImages(html, post.cid, report);
      const MARKDOWN_PREFIX = '<!--markdown-->';
      const body = html.startsWith(MARKDOWN_PREFIX)
        ? html.slice(MARKDOWN_PREFIX.length)
        : turndown.turndown(html);
      const date = new Date(Number(post.created) * 1000);
      const fm = toFrontmatter({
        title: post.title,
        date: date.toISOString(),
        categories: cats,
        tags: postTags,
        description: excerpt(html, 120),
        typechoCid: post.cid,
        typechoSlug: String(post.slug || post.cid),
        draft: false,
      });
      await fsPromises.writeFile(
        path.join(POSTS_DIR, `${post.cid}.md`),
        `${fm}\n\n${body}\n`,
        'utf8',
      );
      report.posts.success++;
    } catch (e) {
      report.posts.failed++;
      report.errors.push({ type: 'post', cid: post.cid, message: String(e) });
    }
  }

  const [pages] = await conn.query(
    `SELECT cid, title, slug, text, created, \`order\`, status
     FROM ${cfg.prefix}contents
     WHERE type='page' AND status='publish'
     ORDER BY \`order\`, cid`,
  );

  const exportedPages = [];
  console.log(`Exporting ${pages.length} pages...`);
  for (const page of pages) {
    if (SKIP_PAGE_SLUGS.has(page.slug) || PAGE_TEMPLATE_MAP[page.slug] === 'threat') {
      report.pages.skipped++;
      console.log(`  Skip page: ${page.slug}`);
      continue;
    }
    try {
      let html = page.text || '';
      html = await processImages(html, page.cid, report);
      const MARKDOWN_PREFIX = '<!--markdown-->';
      const body = html.startsWith(MARKDOWN_PREFIX)
        ? html.slice(MARKDOWN_PREFIX.length)
        : turndown.turndown(html);
      const template = PAGE_TEMPLATE_MAP[page.slug] || 'default';
      const date = page.created ? new Date(Number(page.created) * 1000) : new Date();
      const fm = toFrontmatter({
        title: page.title,
        date: date.toISOString(),
        typechoCid: page.cid,
        pageSlug: page.slug,
        template,
        order: page.order || 0,
      });
      await fsPromises.writeFile(
        path.join(PAGES_DIR, `${page.slug}.md`),
        `${fm}\n\n${body}\n`,
        'utf8',
      );
      exportedPages.push({
        title: page.title,
        slug: page.slug,
        template,
        cid: page.cid,
      });
      report.pages.success++;
    } catch (e) {
      report.pages.failed++;
      report.errors.push({ type: 'page', cid: page.cid, message: String(e) });
    }
  }

  const siteMeta = {
    title: siteTitle,
    subtitle: '专注于全栈开发',
    siteUrl,
    postCount: report.posts.success,
    categoryCount: categories.length,
    categories: categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      count: c.count,
    })),
    tags: tags.map((t) => ({
      name: t.name,
      slug: t.slug,
      count: t.count,
    })),
    pages: exportedPages,
    theme: {
      wechatUrl: (theme.wechatUrl || '/theme/images/wechatpay.png').replace(
        /^\/usr\/themes\/tl/,
        '/theme',
      ),
      alipayUrl: (theme.alipayUrl || '/theme/images/alipay.jpeg').replace(
        /^\/usr\/themes\/tl/,
        '/theme',
      ),
      qqUrl: (theme.qqUrl || '/theme/images/qqpay.png').replace(
        /^\/usr\/themes\/tl/,
        '/theme',
      ),
      socialgithub: theme.socialgithub || '',
      socialweibo: theme.socialweibo || '',
      socialrss: '/rss.xml',
      socialemail: theme.socialemail || '',
      socialicp: theme.socialicp || '',
    },
  };

  await fsPromises.writeFile(META_PATH, JSON.stringify(siteMeta, null, 2), 'utf8');
  await fsPromises.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  await conn.end();

  console.log('\nExport complete:');
  console.log(`  Posts: ${report.posts.success} ok, ${report.posts.failed} failed`);
  console.log(
    `  Pages: ${report.pages.success} ok, ${report.pages.skipped} skipped, ${report.pages.failed} failed`,
  );
  console.log(`  Missing images: ${report.missingImages.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
