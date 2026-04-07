export interface ScrapedJob {
  title: string;
  url: string;
  description: string;
  company: string;
  location: string;
  postedAt?: string;
}

export interface SiteConfig {
  url: string;
  keywords?: string;
}

export interface ScraperStrategy {
  name: string;
  scrape: (config: SiteConfig) => Promise<ScrapedJob[]>;
}
