import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

const site = process.env.SITE_URL || process.env.TYPECHO_SITE_URL || 'https://www.easybhu.cn';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [vue()],
  markdown: {
    shikiConfig: {
      theme: 'one-dark-pro',
    },
  },
  vite: {
    envDir: '.',
  },
});
