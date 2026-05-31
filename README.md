# Force's Blog (Astro)

Typecho 静态化迁移版本。从 MySQL 导出 Markdown，构建为纯静态站点。

## 快速开始

```bash
npm install
cp .env.example .env.local    # 配置 MySQL（仅 export 时需要）
npm run export                # 从 Typecho 导出文章（可选）
npm run dev                   # http://localhost:4321
npm run build                 # 构建 + Pagefind 搜索索引
npm run preview               # 预览 dist/
```

## 目录说明

| 路径 | 说明 |
|------|------|
| `scripts/export-typecho.mjs` | MySQL → Markdown 导出脚本 |
| `src/content/posts/` | 文章 |
| `src/content/pages/` | 独立页面 |
| `public/theme/` | tl 主题静态资源 |
| `DEPLOY.md` | 多云部署指南 |

## 已移除功能

- Access 访客统计（侧边栏）
- 威胁统计页
- 评论系统

## 部署

详见 [DEPLOY.md](./DEPLOY.md)。主选 **Cloudflare Pages**。
