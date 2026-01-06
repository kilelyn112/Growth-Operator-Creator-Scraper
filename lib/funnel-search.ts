/**
 * Funnel Search - Google search queries for finding CF/GHL pages
 */

const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

export interface FunnelSearchResult {
  url: string;
  title: string;
  snippet: string;
  query: string;
}

// Niche-specific keywords for funnel searches
const NICHE_KEYWORDS: Record<string, string[]> = {
  // Business & Coaching
  'business coach': ['business coach', 'business coaching', 'entrepreneur coach', 'business mentor'],
  'life coach': ['life coach', 'life coaching', 'transformation coach', 'mindset coach'],
  'executive coach': ['executive coach', 'leadership coach', 'ceo coach'],
  'career coach': ['career coach', 'career coaching', 'job coach'],

  // Finance & Investing
  'trading': ['trading coach', 'forex mentor', 'stock trading course', 'day trading coach'],
  'real estate': ['real estate coach', 'real estate investing', 'wholesaling coach', 'rei mentor'],
  'crypto': ['crypto coach', 'cryptocurrency mentor', 'bitcoin trading'],
  'financial coach': ['financial coach', 'money coach', 'wealth coach'],

  // Marketing & Agency
  'marketing': ['marketing coach', 'digital marketing course', 'marketing mentor'],
  'smma': ['smma coach', 'agency coach', 'social media marketing course'],
  'copywriting': ['copywriting coach', 'copywriter mentor', 'email copywriting'],
  'seo': ['seo coach', 'seo course', 'seo training'],

  // Health & Fitness
  'fitness': ['fitness coach', 'personal trainer', 'online fitness coach'],
  'nutrition': ['nutrition coach', 'diet coach', 'health coach'],
  'weight loss': ['weight loss coach', 'fat loss program', 'transformation coach'],

  // Skills & Creative
  'youtube': ['youtube coach', 'youtube growth', 'youtube course'],
  'podcasting': ['podcast coach', 'podcasting course', 'podcast mentor'],
  'photography': ['photography coach', 'photography course', 'photographer mentor'],
  'music': ['music coach', 'music production course', 'vocal coach'],

  // E-commerce
  'dropshipping': ['dropshipping coach', 'ecommerce coach', 'shopify mentor'],
  'amazon fba': ['amazon fba coach', 'fba course', 'amazon seller coach'],
  'ecommerce': ['ecommerce coach', 'online store mentor', 'ecom course'],

  // Technology
  'ai': ['ai coach', 'ai automation', 'chatgpt course', 'ai agency'],
  'coding': ['coding bootcamp', 'programming course', 'developer coach'],
  'saas': ['saas coach', 'software startup mentor', 'saas course'],

  // Relationships
  'dating': ['dating coach', 'relationship coach', 'love coach'],
  'marriage': ['marriage coach', 'couples coach', 'relationship mentor'],

  // Spiritual & Mindset
  'manifestation': ['manifestation coach', 'law of attraction', 'abundance coach'],
  'meditation': ['meditation coach', 'mindfulness coach', 'spiritual mentor'],
};

// Landing page intent signals
const INTENT_SIGNALS = [
  'free training',
  'free guide',
  'free masterclass',
  'free webinar',
  'book a call',
  'schedule a call',
  'apply now',
  'join now',
  'enroll now',
  'get started',
  'download now',
  'watch now',
  'register free',
  'claim your spot',
];

// Platform-specific queries
const PLATFORM_QUERIES = [
  'site:*.clickfunnels.com',
  '"powered by clickfunnels"',
  '"made with clickfunnels"',
  'inurl:clickfunnels',
];

/**
 * Generate search queries for finding funnels in a niche
 */
export function generateFunnelQueries(niche: string, maxQueries: number = 15): string[] {
  const queries: string[] = [];
  const nicheLower = niche.toLowerCase();

  // Find matching niche keywords
  let nicheTerms: string[] = [niche];
  for (const [key, terms] of Object.entries(NICHE_KEYWORDS)) {
    if (nicheLower.includes(key) || key.includes(nicheLower)) {
      nicheTerms = [...nicheTerms, ...terms];
      break;
    }
  }
  nicheTerms = [...new Set(nicheTerms)]; // Dedupe

  // Generate queries combining niche + intent signals
  for (const term of nicheTerms.slice(0, 3)) {
    for (const signal of INTENT_SIGNALS.slice(0, 4)) {
      queries.push(`"${term}" "${signal}"`);
      if (queries.length >= maxQueries) break;
    }
    if (queries.length >= maxQueries) break;
  }

  // Add platform-specific queries
  for (const platformQuery of PLATFORM_QUERIES) {
    for (const term of nicheTerms.slice(0, 2)) {
      queries.push(`${platformQuery} "${term}"`);
      if (queries.length >= maxQueries) break;
    }
    if (queries.length >= maxQueries) break;
  }

  // Add general funnel queries
  for (const term of nicheTerms.slice(0, 2)) {
    queries.push(`"${term}" landing page`);
    queries.push(`"${term}" sales page`);
    queries.push(`"${term}" funnel`);
    queries.push(`"${term}" coaching program`);
  }

  return queries.slice(0, maxQueries);
}

/**
 * Search Google for funnel pages using SerpAPI
 */
export async function searchForFunnels(
  queries: string[],
  maxResultsPerQuery: number = 10,
  onResult?: (result: FunnelSearchResult) => void
): Promise<FunnelSearchResult[]> {
  if (!SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY is not configured');
  }

  const allResults: FunnelSearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        api_key: SERPAPI_KEY,
        engine: 'google',
        q: query,
        num: maxResultsPerQuery.toString(),
        gl: 'us',
        hl: 'en',
      });

      const response = await fetch(`https://serpapi.com/search?${params}`);
      if (!response.ok) {
        console.error(`SerpAPI error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const organicResults = data.organic_results || [];

      for (const result of organicResults) {
        const url = result.link;
        if (!url || seenUrls.has(url)) continue;

        // Skip non-relevant domains
        if (isExcludedDomain(url)) continue;

        seenUrls.add(url);

        const searchResult: FunnelSearchResult = {
          url,
          title: result.title || '',
          snippet: result.snippet || '',
          query,
        };

        allResults.push(searchResult);
        if (onResult) onResult(searchResult);
      }

      // Rate limiting - be nice to the API
      await sleep(500);
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }

  return allResults;
}

/**
 * Check if URL should be excluded (social media, big platforms, etc.)
 */
function isExcludedDomain(url: string): boolean {
  const excludedDomains = [
    'youtube.com',
    'youtu.be',
    'facebook.com',
    'fb.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'tiktok.com',
    'pinterest.com',
    'reddit.com',
    'amazon.com',
    'wikipedia.org',
    'yelp.com',
    'google.com',
    'apple.com',
    'microsoft.com',
    'github.com',
    'medium.com',
    'quora.com',
    'forbes.com',
    'entrepreneur.com',
    'inc.com',
    'udemy.com',
    'coursera.org',
    'skillshare.com',
  ];

  const urlLower = url.toLowerCase();
  return excludedDomains.some(domain => urlLower.includes(domain));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
