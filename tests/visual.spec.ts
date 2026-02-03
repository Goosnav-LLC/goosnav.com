import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const pages = JSON.parse(fs.readFileSync('reference/pages.json', 'utf8'));

function safeName(p: string): string {
  if (p === '/' || !p) return 'home.png';
  const noQuery = p.split('?')[0].split('#')[0];
  const slug = noQuery.replace(/\W+/g, '_').replace(/^_+|_+$/g, '');
  return (slug || 'page') + '.png';
}

test.describe('Oldweb visual snapshots', () => {
  const paths: string[] = pages.paths ?? [];
  const productPath: string = pages.productPath ?? '';

  for (const p of paths) {
    test(`snapshot ${p}`, async ({ page, baseURL }) => {
      await page.goto(new URL(p, baseURL!).toString(), { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('body', { state: 'visible' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(safeName(p), { fullPage: true });
    });
  }

  if (productPath) {
    test(`snapshot ${productPath}`, async ({ page, baseURL }) => {
      await page.goto(new URL(productPath, baseURL!).toString(), { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('body', { state: 'visible' });

      // Guardrail: ensure the page is a real product template (not 404/empty).
      // Product pages have either a visible add-to-cart form OR a sold-out button.
      const addForm = page.locator('form[action^="/cart/add"] button[type="submit"]:visible');
      const soldOutButton = page.locator('button:has-text("Sold out")');
      const productTitle = page.locator('h1').first();

      // Wait for product title as basic page-load indicator
      await expect(productTitle).toBeVisible({ timeout: 15000 });

      // Either the add-to-cart button or sold-out button should exist
      const hasAddForm = await addForm.count() > 0;
      const hasSoldOut = await soldOutButton.count() > 0;
      expect(hasAddForm || hasSoldOut).toBeTruthy();

      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('product.png', { fullPage: true });
    });
  }
});
