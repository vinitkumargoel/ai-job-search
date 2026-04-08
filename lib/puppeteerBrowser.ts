/**
 * Puppeteer browser singleton + reusable page pool.
 *
 * One browser process is kept alive for the lifetime of the Node.js process.
 * Pages (tabs) are pooled and recycled — never created from scratch on every call.
 *
 * Usage:
 *   import { withPage } from "@/lib/puppeteerBrowser";
 *   const result = await withPage(async (page) => { ... });
 *
 * The pool is bounded by POOL_SIZE. Callers that exceed the pool size wait
 * until a page becomes available (no unbounded tab explosion).
 */

import puppeteer, { type Browser, type Page } from "puppeteer";

// ─── Config ────────────────────────────────────────────────────────────────
const POOL_SIZE  = 5;   // max concurrent tabs
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0.0.0 Safari/537.36";

// ─── Browser singleton ─────────────────────────────────────────────────────
let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;

  _browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--ignore-certificate-errors",   // handles corporate SSL-inspection proxies
    ],
  });

  _browser.on("disconnected", () => { _browser = null; });
  return _browser;
}

// ─── Page pool ─────────────────────────────────────────────────────────────
interface PoolEntry {
  page:   Page;
  inUse:  boolean;
}

const _pool: PoolEntry[]           = [];
const _waitQueue: (() => void)[]   = [];

/** Create one fresh configured page and add it to the pool */
async function createPoolPage(): Promise<PoolEntry> {
  const browser = await getBrowser();
  const page    = await browser.newPage();

  await page.setUserAgent(USER_AGENT);
  await page.setBypassCSP(true);

  // Block images, fonts, stylesheets — only HTML + XHR needed
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (["image", "stylesheet", "font", "media"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  const entry: PoolEntry = { page, inUse: false };
  _pool.push(entry);
  return entry;
}

/** Acquire a free page from the pool (waits if all are busy) */
async function acquirePage(): Promise<PoolEntry> {
  // Try to find a free existing page
  const free = _pool.find((e) => !e.inUse);
  if (free) {
    free.inUse = true;
    return free;
  }

  // Grow the pool if under the limit
  if (_pool.length < POOL_SIZE) {
    const entry  = await createPoolPage();
    entry.inUse  = true;
    return entry;
  }

  // Pool is full — wait for a page to be released
  return new Promise<PoolEntry>((resolve) => {
    _waitQueue.push(() => {
      const freed = _pool.find((e) => !e.inUse)!;
      freed.inUse = true;
      resolve(freed);
    });
  });
}

/** Return a page to the pool and wake the next waiter if any */
function releasePage(entry: PoolEntry): void {
  entry.inUse = false;
  const next  = _waitQueue.shift();
  if (next) next();
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Checks out a pooled page, runs your callback, then returns the page to
 * the pool. The page is navigated to `about:blank` between uses to clear state.
 */
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const entry = await acquirePage();
  try {
    return await fn(entry.page);
  } finally {
    // Clear state before returning to pool
    await entry.page.goto("about:blank", { waitUntil: "domcontentloaded" }).catch(() => {});
    releasePage(entry);
  }
}

/**
 * Override the default request interception for one page use.
 * Call inside a `withPage` callback before navigating.
 * The interceptor is restored to the default blocker when done.
 */
export async function withCustomInterception<T>(
  page: Page,
  interceptor: (req: import("puppeteer").HTTPRequest) => void,
  fn: () => Promise<T>
): Promise<T> {
  page.removeAllListeners("request");
  page.on("request", interceptor);
  try {
    return await fn();
  } finally {
    page.removeAllListeners("request");
    page.on("request", (req) => {
      if (["image", "stylesheet", "font", "media"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }
}

/** Drain and close the entire browser + all pooled pages (call on shutdown). */
export async function closeBrowser(): Promise<void> {
  for (const entry of _pool) {
    await entry.page.close().catch(() => {});
  }
  _pool.length = 0;

  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}
