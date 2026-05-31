import siteMeta from './data/site-meta.json';

export interface SiteConfig {
  title: string;
  subtitle: string;
  siteUrl: string;
  postsPerPage: number;
  social: {
    github: string;
    weibo: string;
    rss: string;
    email: string;
  };
  donate: {
    wechat: string;
    alipay: string;
    qq: string;
  };
  icp: string;
  avatar: string;
}

const theme = siteMeta.theme as Record<string, string>;

export const siteConfig: SiteConfig = {
  title: siteMeta.title || "Force's Blog",
  subtitle: siteMeta.subtitle || '',
  siteUrl: siteMeta.siteUrl || 'https://www.easybhu.cn',
  postsPerPage: 10,
  social: {
    github: theme.socialgithub || 'https://github.com/fsd-lsh',
    weibo: theme.socialweibo || '',
    rss: '/rss.xml',
    email: theme.socialemail || '',
  },
  donate: {
    wechat: theme.wechatUrl || '/theme/images/wechatpay.png',
    alipay: theme.alipayUrl || '/theme/images/alipay.jpeg',
    qq: theme.qqUrl || '/theme/images/qqpay.png',
  },
  icp: theme.socialicp || '',
  avatar: '/theme/images/avatar.jpg',
};

export type SiteMeta = typeof siteMeta;
export { siteMeta };
