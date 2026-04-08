import type { ScraperStrategy } from "./types";
import { AmazonScraper } from "./amazon";
import { BoschScraper } from "./bosch";
import { CelonisScraper } from "./celonis";
import { Check24Scraper } from "./check24";
import { ContentfulScraper } from "./contentful";
import { DeliveryHeroScraper } from "./deliveryhero";
import { SapScraper } from "./sap";
import { SapFioneerScraper } from "./sapfioneer";
import { SiemensScraper } from "./siemens";
import { SoftwareAgScraper } from "./softwareag";
import { TeamViewerScraper } from "./teamviewer";
import { ZalandoScraper } from "./zalando";
import { ZeissScraper } from "./zeiss";
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
 * 1. Create scrapers/<name>.ts implementing ScraperStrategy
 * 2. Import and register it here — the key must match the Site.scraperKey in DB
 */
export const scraperRegistry: Record<string, ScraperStrategy> = {
  amazon:        AmazonScraper,
  bosch:         BoschScraper,
  celonis:       CelonisScraper,
  check24:       Check24Scraper,
  commercetools: CommercetoolsScraper,
  contentful:    ContentfulScraper,
  deliveryhero:  DeliveryHeroScraper,
  flix:          FlixScraper,
  getyourguide:  GetYourGuideScraper,
  hellofresh:    HelloFreshScraper,
  n26:           N26Scraper,
  raisin:        RaisinScraper,
  sap:           SapScraper,
  sapfioneer:    SapFioneerScraper,
  scout24:       Scout24Scraper,
  siemens:       SiemensScraper,
  softwareag:    SoftwareAgScraper,
  teamviewer:    TeamViewerScraper,
  zalando:       ZalandoScraper,
  zeiss:         ZeissScraper,
};

export const availableScrapers = Object.keys(scraperRegistry);
