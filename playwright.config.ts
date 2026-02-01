import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const pages = JSON.parse(fs.readFileSync('reference/pages.json', 'utf8'));

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      // tolerate tiny rendering noise; keep strict
      maxDiffPixelRatio: 0.002
    }
  },
  use: {
    baseURL: pages.baseURL || 'http://127.0.0.1:9292',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'off'
  },
  reporter: [['list']]
});
