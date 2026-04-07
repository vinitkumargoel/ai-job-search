import type { ScraperStrategy } from "./types";
import { AmazonScraper } from "./amazon";
import { BoschScraper } from "./bosch";
import { CelonisScraper } from "./celonis";
import { Check24Scraper } from "./check24";
import { ContentfulScraper } from "./contentful";
import { DeliveryHeroScraper } from "./deliveryhero";
import { SapFioneerScraper } from "./sapfioneer";
import { ZalandoScraper } from "./zalando";
import {
  N26Scraper,
  RaisinScraper,
  CommercetoolsScraper,
  HelloFreshScraper,
  GetYourGuideScraper,
  FlixScraper,
  Scout24Scraper,
} from "./greenhouse-companies";

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
  bosch: BoschScraper,
  celonis: CelonisScraper,
  check24: Check24Scraper,
  commercetools: CommercetoolsScraper,
  contentful: ContentfulScraper,
  deliveryhero: DeliveryHeroScraper,
  flix: FlixScraper,
  getyourguide: GetYourGuideScraper,
  hellofresh: HelloFreshScraper,
  n26: N26Scraper,
  raisin: RaisinScraper,
  sapfioneer: SapFioneerScraper,
  scout24: Scout24Scraper,
  zalando: ZalandoScraper,
};

export const availableScrapers = Object.keys(scraperRegistry);
