import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const pages = JSON.parse(fs.readFileSync('reference/pages.json', 'utf8'));

test.describe('Oldweb visual snapshots', () => {
  const paths: string[] = pages.paths ?? [];
  const productPath: string = pages.productPath ?? '';

  for (const p of paths) {
    test(`snapshot ${p}`, async ({ page, baseURL }) => {
      await page.goto(new URL(p, baseURL!).toString(), { waitUntil: 'networkidle' });
      // give Shopify/Dawn a beat to settle any lazy UI
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(
        p.replace(/\W+/g, '_').replace(/^_+|_+$/g, '') + '.png',
        { fullPage: true }
      );
    });
  }

  if (productPath) {
    test(`snapshot ${productPath}`, async ({ page, baseURL }) => {
      await page.goto(new URL(productPath, baseURL!).toString(), { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('product.png', { fullPage: true });
    });
  }
});
