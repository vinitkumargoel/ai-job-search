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
import { SennderScraper, Auto1Scraper, AboutYouScraper, ScalableCapitalScraper, SixtScraper } from "./smartrecruiters-companies";
import { BabbelScraper, IdealoScraper, MambuScraper } from "./personio-companies";
import {
  N26Scraper,
  RaisinScraper,
  CommercetoolsScraper,
  HelloFreshScraper,
  GetYourGuideScraper,
  FlixScraper,
  Scout24Scraper,
  // Wave 1
  ParloaScraper,
  HelsingScraper,
  BlackForestLabsScraper,
  // Wave 2
  SumUpScraper,
  TradeRepublicScraper,
  GroverScraper,
  StaffbaseScraper,
  IsarAerospaceScraper,
  // Wave 3
  TrivagoScraper,
  FlaconiScraper,
  FreeNowScraper,
} from "./greenhouse-companies";
import {
  N8nScraper,
  DeepLScraper,
  AlephAlphaScraper,
  SereactScraper,
  // Wave 2
  PersonioScraper,
  EnpalScraper,
  FortoScraper,
  BillieScraper,
} from "./ashby-companies";

/**
 * Scraper Registry — 48 scrapers across 7 ATS platforms
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
  parloa:            ParloaScraper,          // Greenhouse — Berlin/Munich
  helsing:           HelsingScraper,         // Greenhouse — Berlin/Munich
  blackforestlabs:   BlackForestLabsScraper, // Greenhouse — Freiburg
  n8n:               N8nScraper,             // Ashby      — Berlin
  deepl:             DeepLScraper,           // Ashby      — Cologne/Berlin
  alephalpha:        AlephAlphaScraper,      // Ashby      — Heidelberg
  sereact:           SereactScraper,         // Ashby      — Stuttgart
  quantumsystems:    QuantumSystemsScraper,  // Personio   — Munich

  // ── Wave 2: German Unicorns & Scale-ups (Apr 2026) ────────────────────────
  sumup:             SumUpScraper,           // Greenhouse — Berlin
  traderepublic:     TradeRepublicScraper,   // Greenhouse — Berlin
  grover:            GroverScraper,          // Greenhouse — Berlin
  staffbase:         StaffbaseScraper,       // Greenhouse — Chemnitz/Berlin
  isaraerospace:     IsarAerospaceScraper,   // Greenhouse — Munich
  personio:          PersonioScraper,        // Ashby      — Munich/Berlin
  enpal:             EnpalScraper,           // Ashby      — Berlin
  forto:             FortoScraper,           // Ashby      — Berlin/Hamburg
  billie:            BillieScraper,          // Ashby      — Berlin
  sennder:           SennderScraper,         // SmartRec   — Berlin

  // ── Wave 3: Biggest German Product Companies (Apr 2026) ───────────────────
  // Greenhouse
  trivago:           TrivagoScraper,         // trivago.com     — Düsseldorf
  flaconi:           FlaconiScraper,         // flaconi.de      — Berlin
  freenow:           FreeNowScraper,         // free-now.com    — Berlin/Hamburg
  // SmartRecruiters
  auto1:             Auto1Scraper,           // auto1-group.com — Berlin
  aboutyou:          AboutYouScraper,        // aboutyou.com    — Hamburg
  scalablecapital:   ScalableCapitalScraper, // scalable.capital — Berlin/Munich
  sixt:              SixtScraper,            // sixt.com        — Munich
  // Personio (verified via Personio subdomain; work on prod server)
  babbel:            BabbelScraper,          // babbel.com      — Berlin
  idealo:            IdealoScraper,          // idealo.de       — Berlin
  mambu:             MambuScraper,           // mambu.com       — Berlin
};

export const availableScrapers = Object.keys(scraperRegistry);


