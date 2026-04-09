import type { ScraperStrategy, SiteConfig, ScrapedJob } from "./types";

/**
 * Quantum Systems Scraper
 *
 * Career page : https://quantum-systems.jobs.personio.de/
 * ATS         : Personio (subdomain: quantum-systems)
 *
 * Strategy
 * --------
 * Personio exposes a public JSON API at:
 *   GET https://<subdomain>.jobs.personio.de/api/v1/jobs?language=en
 *
 * The response is a JSON array of position objects with id, name, office, etc.
 * For a full description we hit the per-job detail endpoint.
 *
 * Note: as of April 2026 Quantum Systems has no open Personio positions
 * ("Derzeit keine offenen Positionen"). The scraper is built and registered
 * so it activates automatically when they post new roles.
 *
 * Site URL to use: https://quantum-systems.jobs.personio.de/
 */

const PERSONIO_BASE = "https://quantum-systems.jobs.personio.de";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: `${PERSONIO_BASE}/`,
};

const GERMANY_KEYWORDS = [
  "germany",
  "deutschland",
  "berlin",
  "munich",
  "münchen",
  "hamburg",
  "frankfurt",
  "cologne",
  "köln",
  "düsseldorf",
  "dusseldorf",
  "stuttgart",
  "heidelberg",
  "nuremberg",
  "nürnberg",
  "hannover",
  "dortmund",
  "leipzig",
  "münchen",
  "remote",
];

function isGermanyLocation(location: string): boolean {
  const loc = (location ?? "").toLowerCase();
  return GERMANY_KEYWORDS.some((kw) => loc.includes(kw));
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchWithRetry(
  url: string,
  retries = 3,
  timeoutMs = 30000
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, attempt * 3000));
      }
    }
  }
  throw lastErr;
}

export const QuantumSystemsScraper: ScraperStrategy = {
  name: "quantumsystems",

  async scrape(config: SiteConfig): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const keywords = config.keywords?.toLowerCase();

    try {
      const listRes = await fetchWithRetry(
        `${PERSONIO_BASE}/api/v1/jobs?language=en`,
        3,
        30000
      );

      // 404 = no open positions on Personio yet — return empty cleanly
      if (listRes.status === 404) return jobs;
      if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`);

      const data = await listRes.json();
      const positions: {
        id: number;
        name?: string;
        office?: { name?: string } | string;
        department?: { name?: string } | string;
        recruitingCategory?: { name?: string } | string;
        description?: string;
      }[] = Array.isArray(data) ? data : [];

      for (const pos of positions) {
        if (!pos.id || !pos.name) continue;

        // Keyword filter
        if (keywords && !pos.name.toLowerCase().includes(keywords)) continue;

        // Resolve location — Personio can return office as object or string
        const officeName =
          typeof pos.office === "object"
            ? (pos.office as { name?: string }).name ?? ""
            : (pos.office as string) ?? "";

        if (!isGermanyLocation(officeName)) continue;

        // Fetch full description
        let rawHtml = pos.description ?? "";
        let description = rawHtml ? stripHtml(rawHtml) : "";

        if (!rawHtml) {
          try {
            const detailRes = await fetchWithRetry(
              `${PERSONIO_BASE}/api/v1/jobs/${pos.id}`,
              2,
              20000
            );
            if (detailRes.ok) {
              const detail = await detailRes.json();
              rawHtml = detail?.description ?? "";
              description = rawHtml ? stripHtml(rawHtml) : "";
            }
          } catch {
            // proceed without description
          }
        }

        jobs.push({
          title: pos.name,
          url: `${PERSONIO_BASE}/job/${pos.id}`,
          description,
          rawHtml: rawHtml || undefined,
          company: "Quantum Systems",
          location: officeName || "Germany",
          postedAt: "",
        });
      }
    } catch (err) {
      console.error("[QuantumSystemsScraper] Error:", err);
    }

    return jobs;
  },
};
