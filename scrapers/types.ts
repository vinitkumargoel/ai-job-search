export interface ScrapedJob {
  title: string;
  url: string;
  description: string;   // plain text (stripped)
  rawHtml?: string;      // original HTML/text before stripping — fed to Ollama for richer extraction
  company: string;
  location: string;
  postedAt?: string;
}

export interface SiteConfig {
  url: string;
  keywords?: string;
  /** If true, Puppeteer scrapers stop after the first page (used in smoke tests) */
  firstPageOnly?: boolean;
  /** URLs already in DB - scraper can skip these to focus on new jobs */
  existingUrls?: Set<string>;
  /** Maximum number of NEW jobs to fetch descriptions for */
  maxNewJobs?: number;
}

export interface ScraperStrategy {
  name: string;
  scrape: (config: SiteConfig) => Promise<ScrapedJob[]>;
}
