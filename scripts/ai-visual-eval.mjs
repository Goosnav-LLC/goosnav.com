/**
 * ai-visual-eval.mjs
 *
 * Screenshots every page defined in reference/pages.json, sends each to
 * an AI vision model, and evaluates it against the eBay 2004 / YouTube 2007 aesthetic.
 *
 * Provider resolution (tried in order until one succeeds):
 *   1. Gemini — models tried in priority order; model-not-found errors auto-skip to next
 *   2. OpenAI GPT-4o — used only if every Gemini model fails
 *
 * Exit codes:
 *   0 – all pages PASS
 *   1 – one or more pages FAIL
 *   2 – runtime / API error
 *
 * Env:
 *   GEMINI_API_KEY   – required unless OPENAI_API_KEY is set (fallback: .env)
 *   GEMINI_MODEL     – pin to a specific Gemini model (disables auto-discovery)
 *   OPENAI_API_KEY   – optional; enables GPT-4o fallback (fallback: .env)
 */

import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

function loadEnvFile() {
  const envPath = resolve(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const vars = {};
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

const envFile       = loadEnvFile();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || envFile.GEMINI_API_KEY || null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || envFile.OPENAI_API_KEY || null;

// If the user pinned a specific model, use only that (no auto-discovery).
// Otherwise try the priority list.
const USER_PINNED_MODEL = process.env.GEMINI_MODEL || envFile.GEMINI_MODEL || null;

const GEMINI_MODEL_PRIORITY = [
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
  console.error('ERROR: Neither GEMINI_API_KEY nor OPENAI_API_KEY is set.');
  console.error('Set at least one in the environment or in a .env file at the project root.');
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Load pages config
// ---------------------------------------------------------------------------
let pagesConfig;
try {
  pagesConfig = JSON.parse(readFileSync(resolve(PROJECT_ROOT, 'reference', 'pages.json'), 'utf8'));
} catch (e) {
  console.error('ERROR: Could not read reference/pages.json:', e.message);
  process.exit(2);
}

const routes = [
  ...(pagesConfig.paths || []),
  ...(pagesConfig.productPath ? [pagesConfig.productPath] : [])
];
const BASE_URL = pagesConfig.baseURL || 'http://127.0.0.1:9292';

// ---------------------------------------------------------------------------
// Screenshot directory
// ---------------------------------------------------------------------------
const SCREENSHOT_DIR = resolve(__dirname, 'eval-screenshots');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Shared prompt
// ---------------------------------------------------------------------------
const EVAL_PROMPT = `You are evaluating a Shopify storefront screenshot against a specific vintage web aesthetic.

TARGET AESTHETIC — the page should match ALL of these traits:
• Boxed / table-like layouts with visible borders separating content regions
• Strong, solid borders (1-2 px) around major content blocks
• Compact, dense typography — no large hero text or oversized headings
• Blue hyperlinks (#0000EE or similar classic blue), including visited links
• Muted / off-white or light-grey background colors (no pure white hero sections)
• No modern card shadows, border-radius rounding, or glass-morphism effects
• Minimal or no animations / transitions
• Navigation presented as a horizontal or simple list of plain links, not pill-shaped buttons
• Overall feel: eBay circa 2004-2010 or YouTube circa 2007 — utilitarian, information-dense

INSTRUCTIONS:
1. Carefully examine every visible element on the page.
2. Flag ONLY issues that are fixable via CSS or minimal Liquid template edits.
   Do NOT flag: missing product data, empty cart states, placeholder content, or missing app blocks — those are data issues, not style issues.
3. For each issue, note which element is affected and what CSS property likely needs changing.

OUTPUT FORMAT — respond with EXACTLY this structure, nothing else:

EVALUATION: PASS
(use PASS only if there are zero style issues)

or

EVALUATION: FAIL
ISSUES:
- [element or region] — [what is wrong] — [suggested CSS fix]
- [element or region] — [what is wrong] — [suggested CSS fix]
...`;

// ---------------------------------------------------------------------------
// Gemini API
// ---------------------------------------------------------------------------
function isModelNotFound(status, body) {
  if (status === 404) return true;
  const lower = (body || '').toLowerCase();
  return lower.includes('not found') ||
         lower.includes('model_not_found') ||
         lower.includes('not supported') ||
         lower.includes('does not exist');
}

async function callGemini(base64Image, modelName) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: EVAL_PROMPT }
        ]
      }
    ],
    generationConfig: { temperature: 0, maxOutputTokens: 4096 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    if (isModelNotFound(res.status, errText)) {
      const err = new Error(`Gemini model "${modelName}" not available (HTTP ${res.status})`);
      err.modelNotFound = true;
      throw err;
    }
    throw new Error(`Gemini API returned ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const candidate = json.candidates && json.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    throw new Error('Unexpected Gemini response structure: ' + JSON.stringify(json));
  }
  const textPart = candidate.content.parts.find(p => p.text);
  if (!textPart) {
    throw new Error('No text part in Gemini response: ' + JSON.stringify(json));
  }
  return textPart.text;
}

// ---------------------------------------------------------------------------
// OpenAI API (GPT-4o fallback)
// ---------------------------------------------------------------------------
async function callOpenAI(base64Image) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Image}` }
            },
            { type: 'text', text: EVAL_PROMPT }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 2048
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API returned ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) {
    throw new Error('Unexpected OpenAI response structure: ' + JSON.stringify(json));
  }
  return content;
}

// ---------------------------------------------------------------------------
// Provider resolver — auto-discovers which model works, then caches it
// ---------------------------------------------------------------------------
let resolvedProvider = null; // 'gemini' | 'openai'
let resolvedModel    = null; // e.g. 'gemini-2.5-pro' or 'gpt-4o'

async function evaluate(base64Image) {
  // Fast path: provider already resolved from a previous call
  if (resolvedProvider === 'gemini') return callGemini(base64Image, resolvedModel);
  if (resolvedProvider === 'openai') return callOpenAI(base64Image);

  // --- Try Gemini models in priority order ---
  if (GEMINI_API_KEY) {
    const modelsToTry = USER_PINNED_MODEL ? [USER_PINNED_MODEL] : [...GEMINI_MODEL_PRIORITY];

    for (const model of modelsToTry) {
      try {
        console.log(`  [eval] Trying Gemini model: ${model}...`);
        const result = await callGemini(base64Image, model);
        resolvedProvider = 'gemini';
        resolvedModel    = model;
        console.log(`  [eval] Resolved provider: Gemini (${model})`);
        return result;
      } catch (e) {
        if (e.modelNotFound) {
          console.log(`  [eval] ${model} — not available, skipping`);
          continue;
        }
        // Real error (auth, network, etc.) — don't keep trying other models
        throw e;
      }
    }
    console.log('  [eval] All Gemini models unavailable.');
  }

  // --- Fall back to OpenAI ---
  if (OPENAI_API_KEY) {
    console.log('  [eval] Falling back to OpenAI GPT-4o...');
    const result = await callOpenAI(base64Image);
    resolvedProvider = 'openai';
    resolvedModel    = 'gpt-4o';
    console.log('  [eval] Resolved provider: OpenAI (gpt-4o)');
    return result;
  }

  throw new Error(
    'All Gemini models returned model-not-found and OPENAI_API_KEY is not set. ' +
    'Set OPENAI_API_KEY or fix GEMINI_API_KEY permissions.'
  );
}

// ---------------------------------------------------------------------------
// Parse evaluation response (provider-agnostic)
// ---------------------------------------------------------------------------
function parseEvaluation(text) {
  const lines = text.trim().split('\n');
  let verdict = null;
  const issues = [];

  for (const line of lines) {
    const upper = line.trim().toUpperCase();
    if (upper.startsWith('EVALUATION:')) {
      const v = upper.replace('EVALUATION:', '').trim();
      if (v === 'PASS' || v === 'FAIL') verdict = v;
    }
    if (verdict === 'FAIL' && line.trim().startsWith('- ')) {
      issues.push(line.trim().slice(2));
    }
  }

  if (!verdict) {
    const fullText = text.toUpperCase();
    if (fullText.includes('EVALUATION: PASS'))      verdict = 'PASS';
    else if (fullText.includes('EVALUATION: FAIL')) verdict = 'FAIL';
    else {
      verdict = 'FAIL';
      issues.push('(Could not parse evaluation verdict from AI response — defaulting to FAIL)');
    }
  }

  return { verdict, issues };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('[ai-visual-eval] Provider resolution: Gemini → OpenAI');
  console.log(`[ai-visual-eval] Gemini models: ${USER_PINNED_MODEL || GEMINI_MODEL_PRIORITY.join(', ')}`);
  console.log(`[ai-visual-eval] OpenAI fallback: ${OPENAI_API_KEY ? 'enabled' : 'disabled'}`);
  console.log(`[ai-visual-eval] Evaluating ${routes.length} page(s) against eBay 2004 / YouTube 2007 aesthetic\n`);

  // --- 1. Screenshot all pages ---
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.error('ERROR: Failed to launch Playwright chromium. Run `npx playwright install` first.');
    console.error(e.message);
    process.exit(2);
  }

  const page = await browser.newPage();
  const screenshots = [];

  for (const route of routes) {
    const url = BASE_URL + route;
    const safeName = route.replace(/[^a-zA-Z0-9]/g, '_') || 'index';
    const filePath = resolve(SCREENSHOT_DIR, `${safeName}.png`);

    console.log(`  [screenshot] ${route}`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      // Wait for all styles to fully apply, including lazy-loaded CSS
      await page.waitForTimeout(3000);
      await page.screenshot({ path: filePath, fullPage: true });
      const base64 = readFileSync(filePath).toString('base64');
      screenshots.push({ route, filePath, base64 });
    } catch (e) {
      console.error(`  ERROR: Could not screenshot ${route}: ${e.message}`);
      process.exit(2);
    }
  }

  await browser.close();
  console.log(`  [screenshot] Done — ${screenshots.length} page(s) captured\n`);

  // --- 2. Evaluate each screenshot ---
  const results = [];

  for (const { route, base64 } of screenshots) {
    console.log(`  [eval] Evaluating ${route}...`);
    let rawResponse;
    try {
      rawResponse = await evaluate(base64);
    } catch (e) {
      console.error(`  ERROR evaluating ${route}: ${e.message}`);
      process.exit(2);
    }

    const { verdict, issues } = parseEvaluation(rawResponse);
    results.push({ route, verdict, issues });
  }

  // --- 3. Print results ---
  console.log('\n' + '='.repeat(70));
  console.log('AI VISUAL EVALUATION RESULTS');
  console.log(`Provider: ${resolvedProvider} | Model: ${resolvedModel}`);
  console.log('='.repeat(70) + '\n');

  let passCount = 0;
  for (const { route, verdict, issues } of results) {
    const icon = verdict === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${route} — ${verdict}`);
    if (verdict === 'FAIL' && issues.length > 0) {
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    }
    if (verdict === 'PASS') passCount++;
    console.log('');
  }

  console.log('='.repeat(70));
  const overall = passCount === results.length ? 'PASS' : 'FAIL';
  console.log(`Passed: ${passCount}/${results.length} | Overall: ${overall}`);
  console.log('='.repeat(70));

  process.exit(overall === 'PASS' ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(2);
});
