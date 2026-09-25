export interface MetaTag {
  name?: string | undefined;
  property?: string | undefined;
  content?: string | undefined;
  charset?: string | undefined;
  httpEquiv?: string | undefined;
  [key: string]: any;
}

export interface HeadConfig {
  title?: string | undefined;
  meta?: MetaTag[] | undefined;
  links?: Array<{ rel: string; href: string; [key: string]: any }> | undefined;
}

export interface HeadExtractionResult {
  title?: string | undefined;
  headHtml: string;
  bodyHtml: string;
}

export interface SitemapEntry {
  url: string;
  lastmod?: string | undefined;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' | undefined;
  priority?: number | undefined;
}
