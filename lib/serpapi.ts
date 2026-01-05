const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

// Intent signals - phrases that indicate someone is selling coaching/courses
const INTENT_SIGNALS = [
  '"coaching program"',
  '"mentorship"',
  '"private clients"',
  '"book a call"',
  '"apply now"',
  '"work with me"',
  '"1:1 coaching"',
  '"free training"',
  '"join my"',
  '"DM me"',
];

// Niche keywords mapped to search terms
const NICHE_KEYWORDS: Record<string, string[]> = {
  // TRADING / INVESTING
  trading: ['trading coach', 'forex mentor', 'prop firm coach', 'day trading coach', 'crypto trading coach', 'stock trading mentor'],
  forex: ['forex mentor', 'forex coach', 'forex trading course'],
  crypto: ['crypto coach', 'crypto mentor', 'bitcoin trading coach', 'crypto trading signals'],

  // ECOM / AMAZON / SHOPIFY
  dropshipping: ['dropshipping coach', 'dropship mentor', 'ecom coach', 'shopify coach', 'ecommerce mentor'],
  amazon: ['amazon fba coach', 'amazon fba mentorship', 'amazon seller coach', 'fba mentor'],
  ecommerce: ['ecommerce coach', 'ecom mentor', 'shopify mentor', 'online store coach'],
  shopify: ['shopify coach', 'shopify mentor', 'shopify dropshipping coach'],

  // REAL ESTATE / AIRBNB
  realestate: ['real estate coach', 'real estate mentor', 'real estate investing coach', 'wholesaling coach'],
  airbnb: ['airbnb coach', 'airbnb automation', 'short term rental coach', 'str mentorship'],
  wholesaling: ['wholesaling real estate coach', 'real estate wholesaling mentor'],

  // AGENCIES
  smma: ['smma coach', 'social media marketing agency coach', 'agency coach'],
  marketing: ['marketing coach', 'digital marketing mentor', 'facebook ads coach', 'tiktok ads agency'],

  // AI / AUTOMATION
  ai: ['ai automation agency', 'ai coach', 'ai agency coach', 'chatbot agency'],
  automation: ['automation coach', 'system building coach', 'operations consultant'],

  // COACHING / CONSULTING
  business: ['business coach', 'online business mentor', 'entrepreneur coach', 'startup mentor'],
  coaching: ['coaching business coach', 'high ticket coach', 'sales coach', 'closer coach'],
  sales: ['high ticket closer coach', 'remote closing coach', 'sales coaching program'],
  copywriting: ['copywriting coach', 'email copywriter mentor', 'copywriting mentorship'],

  // CONTENT / PERSONAL BRAND
  youtube: ['youtube coach', 'youtube growth mentor', 'content creator coach'],
  content: ['content creator coach', 'personal brand coach', 'short form content coach'],

  // FREELANCE
  freelance: ['freelance coach', 'freelancing mentor', 'high income skill coach'],

  // DEFAULT - general business coaching terms
  default: ['online business coach', 'make money online mentor', 'entrepreneur coach'],
};

export interface SerpApiResult {
  platform: 'instagram' | 'x' | 'youtube';
  url: string;
  username: string;
  title: string;
  snippet: string;
  sourceQuery: string;
}

/**
 * Generate search queries for a niche and platform
 */
function generateQueries(keyword: string, platform: 'instagram' | 'x'): string[] {
  const queries: string[] = [];
  const lowerKeyword = keyword.toLowerCase();

  // Get niche-specific search terms
  let searchTerms: string[] = [];
  for (const [niche, terms] of Object.entries(NICHE_KEYWORDS)) {
    if (lowerKeyword.includes(niche) || niche.includes(lowerKeyword)) {
      searchTerms.push(...terms);
    }
  }

  // If no specific niche found, use default + the keyword itself
  if (searchTerms.length === 0) {
    searchTerms = [...NICHE_KEYWORDS.default, `${keyword} coach`, `${keyword} mentor`];
  }

  // Remove duplicates
  searchTerms = [...new Set(searchTerms)];

  // Site filter based on platform
  const siteFilter = platform === 'instagram'
    ? 'site:instagram.com'
    : 'site:x.com OR site:twitter.com';

  // Generate queries combining search terms with intent signals
  // Limit to avoid too many API calls
  const termsToUse = searchTerms.slice(0, 6);
  const intentsToUse = INTENT_SIGNALS.slice(0, 4);

  for (const term of termsToUse) {
    // Query with intent signal
    for (const intent of intentsToUse) {
      queries.push(`${term} ${intent} ${siteFilter}`);
    }
    // Also add query without intent (broader search)
    queries.push(`${term} ${siteFilter}`);
  }

  return queries;
}

/**
 * Extract username from Instagram or X URL
 */
function extractUsername(url: string, platform: 'instagram' | 'x'): string | null {
  try {
    if (platform === 'instagram') {
      // Instagram URLs: instagram.com/username or instagram.com/username/
      const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match && match[1] && !['p', 'reel', 'stories', 'explore', 'accounts'].includes(match[1])) {
        return match[1];
      }
    } else {
      // X/Twitter URLs: x.com/username or twitter.com/username
      const match = url.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/);
      if (match && match[1] && !['search', 'explore', 'home', 'i', 'settings', 'hashtag'].includes(match[1])) {
        return match[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Search Google via SerpAPI for coaches on a specific platform
 * @param keyword - The niche/keyword to search for
 * @param platform - 'instagram' or 'x'
 * @param maxResults - Maximum results to return
 * @param queryOffset - Skip first N queries (for continuation)
 * @param existingUsernames - Set of usernames to exclude (already processed)
 */
export async function searchGoogleForCreators(
  keyword: string,
  platform: 'instagram' | 'x',
  maxResults: number = 50,
  queryOffset: number = 0,
  existingUsernames?: Set<string>
): Promise<SerpApiResult[]> {
  if (!SERPAPI_KEY) {
    console.error('[SerpAPI] No API key configured');
    return [];
  }

  const queries = generateQueries(keyword, platform);
  console.log(`[SerpAPI] Generated ${queries.length} queries for "${keyword}" on ${platform}`);
  console.log(`[SerpAPI] Query offset: ${queryOffset}, excluding ${existingUsernames?.size || 0} existing usernames`);

  const results: SerpApiResult[] = [];
  const seenUsernames = new Set<string>(existingUsernames || []);

  // Process queries (limit to avoid excessive API usage), starting from offset
  const queriesToRun = queries.slice(queryOffset, queryOffset + 15);

  for (const query of queriesToRun) {
    if (results.length >= maxResults) break;

    try {
      console.log(`[SerpAPI] Searching: ${query.slice(0, 60)}...`);

      const params = new URLSearchParams({
        engine: 'google',
        api_key: SERPAPI_KEY,
        q: query,
        num: '10',
      });

      const response = await fetch(`https://serpapi.com/search?${params}`);

      if (!response.ok) {
        console.log(`[SerpAPI] Query failed: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const organicResults = data.organic_results || [];

      for (const result of organicResults) {
        const url = result.link || '';

        // Check if URL matches the platform
        const isInstagram = url.includes('instagram.com');
        const isX = url.includes('x.com') || url.includes('twitter.com');

        if ((platform === 'instagram' && !isInstagram) || (platform === 'x' && !isX)) {
          continue;
        }

        // Extract username
        const username = extractUsername(url, platform);
        if (!username || seenUsernames.has(username.toLowerCase())) {
          continue;
        }
        seenUsernames.add(username.toLowerCase());

        results.push({
          platform,
          url,
          username,
          title: result.title || '',
          snippet: result.snippet || '',
          sourceQuery: query,
        });

        if (results.length >= maxResults) break;
      }

      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`[SerpAPI] Error with query:`, error);
    }
  }

  console.log(`[SerpAPI] Found ${results.length} unique ${platform} profiles`);
  return results;
}

/**
 * Get profile data for X/Twitter users
 * Note: X API is restricted, so we return basic data from search
 */
export interface XProfile {
  username: string;
  displayName: string;
  bio: string;
  url: string;
  followersCount: number;
  sourceQuery: string;
}

export function convertSerpResultToXProfile(result: SerpApiResult): XProfile {
  return {
    username: result.username,
    displayName: result.title.split('(')[0]?.trim() || result.username,
    bio: result.snippet,
    url: result.url,
    followersCount: 0, // We don't have this from Google search
    sourceQuery: result.sourceQuery,
  };
}
