import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

function ensureDir(filepath) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
}

function isValidHttpUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function hideWaybackChrome(page) {
  // Hide Wayback toolbar + common overlays. Keep this broad for determinism.
  await page.addStyleTag({
    content: `
      #wm-ipp, #wm-ipp-base, .wm-ipp, .wb-autocomplete-suggestions,
      .__wb_overlay, .__wb_dialog,
      iframe[id^="__wb"], iframe[src*="web.archive.org"] { display: none !important; visibility: hidden !important; }
      html, body { margin-top: 0 !important; }
    `
  });
}

async function stableWait(page) {
  await page.waitForLoadState("domcontentloaded");
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}
  await page.waitForTimeout(1200);
}

async function main() {
  const targetsPath = process.argv[2] || "tools/reference-capture/targets.json";
  const raw = fs.readFileSync(targetsPath, "utf8");
  const targets = JSON.parse(raw);

  const headless = process.env.HEADLESS === "0" ? false : true;

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    // Some old pages behave better with a boring desktop UA.
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    locale: "en-US"
  });

  const log = [];
  log.push(`# Reference capture log`);
  log.push(`- date: ${new Date().toISOString()}`);
  log.push(`- targets: ${targetsPath}`);
  log.push(`- headless: ${headless}`);
  log.push("");

  // Validate output path uniqueness to prevent silent overwrites
  const seen = new Set();
  for (const job of targets.jobs || []) {
    for (const k of ["screenshot", "html"]) {
      if (job[k]) {
        const key = `${k}:${job[k]}`;
        if (seen.has(key)) {
          throw new Error(`Duplicate output path detected (${key}). Fix targets.json to use unique paths.`);
        }
        seen.add(key);
      }
    }
  }

  for (const job of targets.jobs || []) {
    const page = await context.newPage();

    log.push(`## ${job.id}`);
    log.push(`- url: ${job.url}`);
    log.push(`- viewport: ${job.viewport?.width}x${job.viewport?.height}`);
    log.push(`- fullPage: ${job.fullPage === true}`);

    try {
      if (!job.url || !isValidHttpUrl(job.url) || job.url.includes("PASTE_WAYBACK_URL_HERE")) {
        throw new Error(`Invalid url in targets.json for job "${job.id}": ${job.url}`);
      }
      if (!job.viewport?.width || !job.viewport?.height) {
        throw new Error(`Missing viewport for job "${job.id}".`);
      }
      if (!job.screenshot) {
        throw new Error(`Missing screenshot path for job "${job.id}".`);
      }

      await page.setViewportSize({ width: job.viewport.width, height: job.viewport.height });

      await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 90000 });
      await stableWait(page);

      await hideWaybackChrome(page);
      await stableWait(page);

      ensureDir(job.screenshot);
      await page.screenshot({
        path: job.screenshot,
        fullPage: job.fullPage === true
      });
      log.push(`- screenshot: ${job.screenshot}`);

      if (job.saveHtml) {
        const html = await page.content();
        const htmlPath =
          job.html ||
          job.screenshot
            .replace("reference/screenshots/", "reference/html/")
            .replace(/\.png$/i, ".html");

        ensureDir(htmlPath);
        fs.writeFileSync(htmlPath, html, "utf8");
        log.push(`- html: ${htmlPath}`);
      }

      log.push(`- status: ok`);
    } catch (e) {
      log.push(`- status: FAIL`);
      log.push(`- error: ${String(e?.message || e)}`);
    } finally {
      log.push("");
      await page.close();
    }
  }

  const logPath = "reference/notes/CAPTURE_LOG.md";
  ensureDir(logPath);
  fs.writeFileSync(logPath, log.join("\n"), "utf8");

  await browser.close();
  console.log(`Done. Wrote log to ${logPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});