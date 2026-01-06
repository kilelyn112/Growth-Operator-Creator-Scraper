/**
 * Funnel Detection Engine
 * Detects ClickFunnels and GoHighLevel pages from HTML content
 */

import { FunnelPlatform } from './db';

export interface DetectionResult {
  detected: boolean;
  platform: FunnelPlatform;
  confidence: number; // 0-100
  signals: string[]; // What was detected
}

// ClickFunnels detection signatures
const CLICKFUNNELS_SIGNATURES = {
  scripts: [
    'clickfunnels.com',
    'assets.clickfunnels.com',
    'js.clickfunnels.com',
    'track.clickfunnels.com',
  ],
  classes: [
    'elPageContent',
    'containerWrapper',
    'elBTN',
    'elHeadline',
    'elImageWrapper',
    'elVideoWrapper',
    'de-image-block',
    'elInput',
    'elFormItemWrapper',
    'elOrderProductOptinProductName',
  ],
  ids: [
    'cf_toggle_panel',
    'cfvid',
  ],
  meta: [
    'clickfunnels',
    'cf-turnstile',
  ],
  urlPatterns: [
    /\.clickfunnels\.com/i,
    /\/optin\/?$/i,
    /\/order-form\/?$/i,
    /\/thank-you\/?$/i,
    /\/oto\d*\/?$/i, // One-time offer pages
  ],
  htmlPatterns: [
    /data-cf-/i,
    /cf-section/i,
    /powered by clickfunnels/i,
    /made with clickfunnels/i,
  ],
};

// GoHighLevel detection signatures
const GOHIGHLEVEL_SIGNATURES = {
  scripts: [
    'gohighlevel.com',
    'msgsndr.com',
    'leadconnectorhq.com',
    'highlevel.io',
    'hl-cdn.com',
  ],
  classes: [
    'hl-page-builder',
    'hl-page',
    'hl-form',
    'leadconnector',
    'ghl-form',
    'hl_wrapper',
    'hl-text',
    'hl-button',
    'hl-image',
  ],
  ids: [
    'hlLiveChat',
    'ghl-chat',
  ],
  meta: [
    'highlevel',
    'leadconnector',
    'gohighlevel',
  ],
  urlPatterns: [
    /\.gohighlevel\.com/i,
    /\.leadconnectorhq\.com/i,
    /\.msgsndr\.com/i,
  ],
  htmlPatterns: [
    /data-hl-/i,
    /powered by.*highlevel/i,
    /leadconnector/i,
    /msgsndr/i,
  ],
};

/**
 * Detect if HTML content is from ClickFunnels or GoHighLevel
 */
export function detectFunnelPlatform(html: string, url?: string): DetectionResult {
  const htmlLower = html.toLowerCase();

  // Check ClickFunnels
  const cfResult = detectClickFunnels(htmlLower, url);
  if (cfResult.detected && cfResult.confidence >= 50) {
    return cfResult;
  }

  // Check GoHighLevel
  const ghlResult = detectGoHighLevel(htmlLower, url);
  if (ghlResult.detected && ghlResult.confidence >= 50) {
    return ghlResult;
  }

  // Return the one with higher confidence, or 'other' if neither detected
  if (cfResult.confidence > ghlResult.confidence && cfResult.confidence >= 30) {
    return cfResult;
  }
  if (ghlResult.confidence > cfResult.confidence && ghlResult.confidence >= 30) {
    return ghlResult;
  }

  return {
    detected: false,
    platform: 'other',
    confidence: 0,
    signals: [],
  };
}

function detectClickFunnels(html: string, url?: string): DetectionResult {
  const signals: string[] = [];
  let score = 0;

  // Check script sources (high confidence)
  for (const script of CLICKFUNNELS_SIGNATURES.scripts) {
    if (html.includes(script.toLowerCase())) {
      signals.push(`Script: ${script}`);
      score += 30;
    }
  }

  // Check CSS classes (medium confidence)
  for (const cls of CLICKFUNNELS_SIGNATURES.classes) {
    if (html.includes(`class="${cls.toLowerCase()}"`) ||
        html.includes(`class='${cls.toLowerCase()}'`) ||
        html.includes(`class="${cls}"`) ||
        html.includes(cls.toLowerCase())) {
      signals.push(`Class: ${cls}`);
      score += 15;
    }
  }

  // Check IDs (medium confidence)
  for (const id of CLICKFUNNELS_SIGNATURES.ids) {
    if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) {
      signals.push(`ID: ${id}`);
      score += 15;
    }
  }

  // Check meta/comments (medium confidence)
  for (const meta of CLICKFUNNELS_SIGNATURES.meta) {
    if (html.includes(meta.toLowerCase())) {
      signals.push(`Meta: ${meta}`);
      score += 20;
    }
  }

  // Check URL patterns (high confidence)
  if (url) {
    for (const pattern of CLICKFUNNELS_SIGNATURES.urlPatterns) {
      if (pattern.test(url)) {
        signals.push(`URL: ${pattern.source}`);
        score += 40;
      }
    }
  }

  // Check HTML patterns (medium confidence)
  for (const pattern of CLICKFUNNELS_SIGNATURES.htmlPatterns) {
    if (pattern.test(html)) {
      signals.push(`Pattern: ${pattern.source}`);
      score += 20;
    }
  }

  const confidence = Math.min(100, score);

  return {
    detected: confidence >= 50,
    platform: 'clickfunnels',
    confidence,
    signals,
  };
}

function detectGoHighLevel(html: string, url?: string): DetectionResult {
  const signals: string[] = [];
  let score = 0;

  // Check script sources (high confidence)
  for (const script of GOHIGHLEVEL_SIGNATURES.scripts) {
    if (html.includes(script.toLowerCase())) {
      signals.push(`Script: ${script}`);
      score += 30;
    }
  }

  // Check CSS classes (medium confidence)
  for (const cls of GOHIGHLEVEL_SIGNATURES.classes) {
    if (html.includes(`class="${cls.toLowerCase()}"`) ||
        html.includes(`class='${cls.toLowerCase()}'`) ||
        html.includes(`class="${cls}"`) ||
        html.includes(cls.toLowerCase())) {
      signals.push(`Class: ${cls}`);
      score += 15;
    }
  }

  // Check IDs (medium confidence)
  for (const id of GOHIGHLEVEL_SIGNATURES.ids) {
    if (html.includes(`id="${id}"`) || html.includes(`id='${id}'`)) {
      signals.push(`ID: ${id}`);
      score += 15;
    }
  }

  // Check meta/comments (medium confidence)
  for (const meta of GOHIGHLEVEL_SIGNATURES.meta) {
    if (html.includes(meta.toLowerCase())) {
      signals.push(`Meta: ${meta}`);
      score += 20;
    }
  }

  // Check URL patterns (high confidence)
  if (url) {
    for (const pattern of GOHIGHLEVEL_SIGNATURES.urlPatterns) {
      if (pattern.test(url)) {
        signals.push(`URL: ${pattern.source}`);
        score += 40;
      }
    }
  }

  // Check HTML patterns (medium confidence)
  for (const pattern of GOHIGHLEVEL_SIGNATURES.htmlPatterns) {
    if (pattern.test(html)) {
      signals.push(`Pattern: ${pattern.source}`);
      score += 20;
    }
  }

  const confidence = Math.min(100, score);

  return {
    detected: confidence >= 50,
    platform: 'gohighlevel',
    confidence,
    signals,
  };
}

/**
 * Quick check if URL is likely a funnel page (before fetching)
 */
export function isLikelyFunnelUrl(url: string): boolean {
  const urlLower = url.toLowerCase();

  // Check for obvious CF/GHL subdomains
  if (urlLower.includes('clickfunnels.com') ||
      urlLower.includes('gohighlevel.com') ||
      urlLower.includes('msgsndr.com') ||
      urlLower.includes('leadconnectorhq.com')) {
    return true;
  }

  // Check for common funnel path patterns
  const funnelPaths = [
    '/optin', '/opt-in', '/order', '/checkout', '/thank-you', '/thankyou',
    '/webinar', '/training', '/masterclass', '/free-guide', '/free-training',
    '/book-call', '/book-a-call', '/schedule', '/apply', '/register',
    '/oto', '/upsell', '/downsell', '/offer',
  ];

  for (const path of funnelPaths) {
    if (urlLower.includes(path)) {
      return true;
    }
  }

  return false;
}
