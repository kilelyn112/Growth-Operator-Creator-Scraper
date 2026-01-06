/**
 * Funnel Page Scraper
 * Fetches pages, detects platform, extracts owner info, scores quality
 */

import { detectFunnelPlatform, DetectionResult } from './funnel-detector';
import { AddFunnelInput, FunnelPlatform } from './db';

export interface ScrapedFunnel {
  url: string;
  domain: string;
  platform: FunnelPlatform;
  detection: DetectionResult;

  // Page metadata
  title: string | null;
  description: string | null;

  // Owner info
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerInstagram: string | null;
  ownerYoutube: string | null;
  ownerX: string | null;
  ownerLinkedin: string | null;
  ownerWebsite: string | null;

  // Quality analysis
  qualityScore: number;
  issues: string[];
  hasMobileViewport: boolean;
  hasClearCta: boolean;
  hasTestimonials: boolean;
  hasTrustBadges: boolean;
  pageLoadTime: number | null;
}

/**
 * Fetch and analyze a funnel page
 */
export async function scrapeFunnelPage(url: string): Promise<ScrapedFunnel | null> {
  try {
    const startTime = Date.now();

    // Fetch the page with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const loadTime = Date.now() - startTime;

    // Detect platform
    const detection = detectFunnelPlatform(html, url);

    // Extract domain
    const domain = extractDomain(url);

    // Extract metadata
    const title = extractTitle(html);
    const description = extractDescription(html);

    // Extract owner info
    const ownerInfo = extractOwnerInfo(html);

    // Analyze quality
    const quality = analyzeQuality(html, loadTime);

    return {
      url,
      domain,
      platform: detection.platform,
      detection,
      title,
      description,
      ...ownerInfo,
      ...quality,
      pageLoadTime: loadTime,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Extract page title
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract meta description
 */
function extractDescription(html: string): string | null {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract owner/contact information from HTML
 */
function extractOwnerInfo(html: string): {
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerInstagram: string | null;
  ownerYoutube: string | null;
  ownerX: string | null;
  ownerLinkedin: string | null;
  ownerWebsite: string | null;
} {
  return {
    ownerName: extractName(html),
    ownerEmail: extractEmail(html),
    ownerPhone: extractPhone(html),
    ownerInstagram: extractInstagramHandle(html),
    ownerYoutube: extractYoutubeChannel(html),
    ownerX: extractXHandle(html),
    ownerLinkedin: extractLinkedinUrl(html),
    ownerWebsite: null, // The funnel URL is the website
  };
}

/**
 * Extract email addresses
 */
function extractEmail(html: string): string | null {
  // Look for mailto links first
  const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (mailtoMatch) return mailtoMatch[1];

  // Look for email patterns in text
  const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  const emails = html.match(emailPattern);

  if (emails) {
    // Filter out common non-personal emails
    const filtered = emails.filter(email => {
      const lower = email.toLowerCase();
      return !lower.includes('example.com') &&
             !lower.includes('email.com') &&
             !lower.includes('youremail') &&
             !lower.includes('support@') &&
             !lower.includes('info@') &&
             !lower.includes('noreply') &&
             !lower.includes('no-reply');
    });
    return filtered[0] || null;
  }

  return null;
}

/**
 * Extract phone numbers
 */
function extractPhone(html: string): string | null {
  // Look for tel: links first
  const telMatch = html.match(/tel:([+\d\s()-]+)/i);
  if (telMatch) return telMatch[1].trim();

  // US phone pattern
  const phonePattern = /(?:\+1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
  const phones = html.match(phonePattern);

  return phones ? phones[0] : null;
}

/**
 * Extract name from page (look for common patterns)
 */
function extractName(html: string): string | null {
  // Look for structured data
  const personMatch = html.match(/"@type"\s*:\s*"Person"[^}]*"name"\s*:\s*"([^"]+)"/i);
  if (personMatch) return personMatch[1];

  // Look for common name patterns in headings
  const namePatterns = [
    /(?:Hi,?\s*I'?m|Hey,?\s*I'?m|Hello,?\s*I'?m|I'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:with|by|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[,.-]/i,
    /(?:coach|mentor|founder|ceo)\s*[:-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of namePatterns) {
    const match = html.match(pattern);
    if (match && match[1].length > 3) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extract Instagram handle
 */
function extractInstagramHandle(html: string): string | null {
  const patterns = [
    /instagram\.com\/([a-zA-Z0-9._]+)/i,
    /instagr\.am\/([a-zA-Z0-9._]+)/i,
    /@([a-zA-Z0-9._]+)\s*(?:on\s*)?instagram/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1] && !['p', 'reel', 'stories', 'explore'].includes(match[1].toLowerCase())) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract YouTube channel
 */
function extractYoutubeChannel(html: string): string | null {
  const patterns = [
    /youtube\.com\/(?:channel|c|user|@)\/([a-zA-Z0-9_-]+)/i,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract X/Twitter handle
 */
function extractXHandle(html: string): string | null {
  const patterns = [
    /(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i,
    /@([a-zA-Z0-9_]+)\s*(?:on\s*)?(?:twitter|x\b)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1] && !['share', 'intent', 'search', 'home'].includes(match[1].toLowerCase())) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract LinkedIn URL
 */
function extractLinkedinUrl(html: string): string | null {
  const match = html.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
}

/**
 * Analyze page quality
 */
function analyzeQuality(html: string, loadTime: number): {
  qualityScore: number;
  issues: string[];
  hasMobileViewport: boolean;
  hasClearCta: boolean;
  hasTestimonials: boolean;
  hasTrustBadges: boolean;
} {
  const issues: string[] = [];
  let score = 50; // Start at 50

  // Check mobile viewport
  const hasMobileViewport = /viewport/.test(html) && /width=device-width/i.test(html);
  if (!hasMobileViewport) {
    issues.push('Missing mobile viewport');
    score -= 15;
  } else {
    score += 10;
  }

  // Check for clear CTA
  const ctaPatterns = [
    /(?:get|start|join|register|sign up|enroll|apply|book|schedule|claim|download|watch)/i,
    /class=["'][^"']*(?:btn|button|cta)[^"']*["']/i,
    /<button[^>]*>/i,
  ];
  const hasClearCta = ctaPatterns.some(p => p.test(html));
  if (!hasClearCta) {
    issues.push('No clear call-to-action');
    score -= 10;
  } else {
    score += 10;
  }

  // Check for testimonials
  const testimonialPatterns = [
    /testimonial/i,
    /review/i,
    /what\s+(?:people|clients|students|customers)\s+(?:are\s+)?say/i,
    /success\s+stor/i,
    /★|⭐|rating/i,
  ];
  const hasTestimonials = testimonialPatterns.some(p => p.test(html));
  if (!hasTestimonials) {
    issues.push('No testimonials or social proof');
    score -= 10;
  } else {
    score += 15;
  }

  // Check for trust badges
  const trustPatterns = [
    /guarantee/i,
    /secure/i,
    /ssl|https/i,
    /money.?back/i,
    /trusted|verified/i,
    /as\s+seen\s+(?:on|in)/i,
    /featured\s+(?:on|in)/i,
  ];
  const hasTrustBadges = trustPatterns.some(p => p.test(html));
  if (!hasTrustBadges) {
    issues.push('No trust badges or guarantees');
    score -= 5;
  } else {
    score += 10;
  }

  // Check load time
  if (loadTime > 5000) {
    issues.push('Slow page load (>5s)');
    score -= 15;
  } else if (loadTime > 3000) {
    issues.push('Page load could be faster');
    score -= 5;
  } else {
    score += 5;
  }

  // Check for basic SEO
  const hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(html);
  const hasDescription = /name=["']description["']/i.test(html);
  if (!hasTitle || !hasDescription) {
    issues.push('Missing SEO basics (title/description)');
    score -= 5;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    qualityScore: score,
    issues,
    hasMobileViewport,
    hasClearCta,
    hasTestimonials,
    hasTrustBadges,
  };
}

/**
 * Convert scraped funnel to database input format
 */
export function toFunnelInput(
  scraped: ScrapedFunnel,
  jobId: string,
  niche: string,
  query: string
): AddFunnelInput {
  return {
    job_id: jobId,
    funnel_url: scraped.url,
    domain: scraped.domain,
    platform: scraped.platform,
    niche,

    quality_score: scraped.qualityScore,
    issues: scraped.issues,
    has_mobile_viewport: scraped.hasMobileViewport,
    has_clear_cta: scraped.hasClearCta,
    has_testimonials: scraped.hasTestimonials,
    has_trust_badges: scraped.hasTrustBadges,
    page_load_time: scraped.pageLoadTime,

    owner_name: scraped.ownerName,
    owner_email: scraped.ownerEmail,
    owner_phone: scraped.ownerPhone,
    owner_instagram: scraped.ownerInstagram,
    owner_youtube: scraped.ownerYoutube,
    owner_x: scraped.ownerX,
    owner_linkedin: scraped.ownerLinkedin,
    owner_website: scraped.ownerWebsite,

    discovery_source: 'google',
    search_query: query,

    page_title: scraped.title,
    page_description: scraped.description,
  };
}
