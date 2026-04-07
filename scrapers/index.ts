import type { ScraperStrategy } from "./types";
import { AmazonScraper } from "./amazon";

/**
 * Scraper Registry
 *
 * To add a new scraper:
 * 1. Create a new file: scrapers/yoursite.ts
 * 2. Implement the ScraperStrategy interface
 * 3. Import and register it here
 *
 * The key must match the `scraperKey` field stored in the Site model.
 */
export const scraperRegistry: Record<string, ScraperStrategy> = {
  amazon: AmazonScraper,
};

export const availableScrapers = Object.keys(scraperRegistry);
