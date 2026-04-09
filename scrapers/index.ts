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
import { QuantumSystemsScraper } from "./quantumsystems";
import { SennderScraper } from "./smartrecruiters-companies";
import {
  N26Scraper,
  RaisinScraper,
  CommercetoolsScraper,
  HelloFreshScraper,
  GetYourGuideScraper,
  FlixScraper,
  Scout24Scraper,
  // Wave 1 (Apr 2026 — German IT Startups)
  ParloaScraper,
  HelsingScraper,
  BlackForestLabsScraper,
  // Wave 2 (Apr 2026 — German Unicorns & Scale-ups)
  SumUpScraper,
  TradeRepublicScraper,
  GroverScraper,
  StaffbaseScraper,
  IsarAerospaceScraper,
} from "./greenhouse-companies";
import {
  N8nScraper,
  DeepLScraper,
  AlephAlphaScraper,
  SereactScraper,
  // Wave 2 (Apr 2026 — German Unicorns & Scale-ups)
  PersonioScraper,
  EnpalScraper,
  FortoScraper,
  BillieScraper,
} from "./ashby-companies";

/**
 * Scraper Registry
 *
 * To add a new scraper:
 * 1. Create scrapers/<name>.ts implementing ScraperStrategy
 * 2. Import and register it here — the key must match the Site.scraperKey in DB
 *
 * ─── ATS Quick Reference ──────────────────────────────────────────────────────
 * Greenhouse API   : GET https://api.greenhouse.io/v1/boards/<slug>/jobs?content=true
 * Ashby GraphQL    : POST https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams
 * SmartRecruiters  : GET https://api.smartrecruiters.com/v1/companies/<Slug>/postings?country=de
 * Workday          : POST https://<tenant>.wd3.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs
 * SAP SF RSS       : GET https://jobs.sap.com/services/rss/job/?locale=en_US&country=Germany
 * Teamtailor       : Sitemap + JSON-LD per page (API blocked on corporate network)
 * Avature          : Puppeteer only (Siemens)
 * Dayforce HCM     : Puppeteer only (SoftwareAG)
 * Personio         : GET https://<subdomain>.jobs.personio.de/api/v1/jobs?language=en
 */
export const scraperRegistry: Record<string, ScraperStrategy> = {
  // ── Original scrapers ──────────────────────────────────────────────────────
  amazon:            AmazonScraper,
  bosch:             BoschScraper,
  celonis:           CelonisScraper,
  check24:           Check24Scraper,
  commercetools:     CommercetoolsScraper,
  contentful:        ContentfulScraper,
  deliveryhero:      DeliveryHeroScraper,
  flix:              FlixScraper,
  getyourguide:      GetYourGuideScraper,
  hellofresh:        HelloFreshScraper,
  n26:               N26Scraper,
  raisin:            RaisinScraper,
  sap:               SapScraper,
  sapfioneer:        SapFioneerScraper,
  scout24:           Scout24Scraper,
  siemens:           SiemensScraper,
  softwareag:        SoftwareAgScraper,
  teamviewer:        TeamViewerScraper,
  zalando:           ZalandoScraper,
  zeiss:             ZeissScraper,

  // ── Wave 1: German IT Startups (Apr 2026) ─────────────────────────────────
  // Greenhouse
  parloa:            ParloaScraper,          // parloa.com          — Berlin/Munich
  helsing:           HelsingScraper,         // helsing.ai          — Berlin/Munich (defence AI)
  blackforestlabs:   BlackForestLabsScraper, // blackforestlabs.ai  — Freiburg (image AI)
  // Ashby
  n8n:               N8nScraper,             // n8n.io              — Berlin (workflow automation)
  deepl:             DeepLScraper,           // deepl.com           — Cologne/Berlin (AI translation)
  alephalpha:        AlephAlphaScraper,      // aleph-alpha.com     — Heidelberg (sovereign LLMs)
  sereact:           SereactScraper,         // sereact.ai          — Stuttgart (robotics AI)
  // Personio
  quantumsystems:    QuantumSystemsScraper,  // quantum-systems.com — Munich (autonomous drones)

  // ── Wave 2: German Unicorns & Scale-ups (Apr 2026) ────────────────────────
  // Greenhouse
  sumup:             SumUpScraper,           // sumup.com           — Berlin (fintech/payments)
  traderepublic:     TradeRepublicScraper,   // traderepublic.com   — Berlin (neobroker)
  grover:            GroverScraper,          // grover.com          — Berlin (tech rental)
  staffbase:         StaffbaseScraper,       // staffbase.com       — Berlin/Chemnitz (HR comms)
  isaraerospace:     IsarAerospaceScraper,   // isaraerospace.com   — Munich/Ottobrunn (rockets)
  // Ashby
  personio:          PersonioScraper,        // personio.com        — Munich/Berlin (HR SaaS)
  enpal:             EnpalScraper,           // enpal.de            — Berlin (solar energy)
  forto:             FortoScraper,           // forto.com           — Berlin/Hamburg (logistics)
  billie:            BillieScraper,          // billie.io           — Berlin (B2B fintech)
  // SmartRecruiters
  sennder:           SennderScraper,         // sennder.com         — Berlin (freight logistics)
};

export const availableScrapers = Object.keys(scraperRegistry);



