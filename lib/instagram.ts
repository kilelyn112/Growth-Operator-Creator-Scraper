const APIFY_API_KEY = process.env.APIFY_API_KEY || '';

// Apify Actor IDs for Instagram (use ~ separator for public actors)
const INSTAGRAM_API_SCRAPER = 'apify~instagram-api-scraper';
const INSTAGRAM_HASHTAG_SCRAPER = 'apify~instagram-hashtag-scraper';
const INSTAGRAM_PROFILE_SCRAPER = 'apify~instagram-profile-scraper';
const INSTAGRAM_SCRAPER = 'apify~instagram-scraper'; // Main scraper with user search

export interface InstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  url: string;
  commentsCount: number;
  likesCount: number;
  timestamp: string;
  ownerUsername: string;
  ownerId: string;
  ownerFullName?: string;
  type: string;
  videoViewCount?: number;
  hashtags?: string[];
}

export interface InstagramProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  externalUrl: string | null;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  businessCategoryName?: string;
  profilePicUrl: string;
  recentPosts?: InstagramPost[];
  email?: string;
  phone?: string;
  relatedProfiles?: string[]; // Usernames of related/suggested profiles
}

export interface InstagramSearchResult {
  username: string;
  userId: string;
  fullName: string;
  biography: string;
  externalUrl: string | null;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  isVerified: boolean;
  isBusinessAccount: boolean;
  businessCategoryName?: string;
  profilePicUrl: string;
  engagementRate: number;
  recentPosts: {
    caption: string;
    likesCount: number;
    commentsCount: number;
    timestamp: string;
  }[];
}

// Raw Apify post response interface
interface ApifyInstagramPost {
  id?: string;
  shortCode?: string;
  shortcode?: string;
  caption?: string;
  url?: string;
  commentsCount?: number;
  comments_count?: number;
  edge_media_to_comment?: { count: number };
  likesCount?: number;
  likes_count?: number;
  edge_liked_by?: { count: number };
  timestamp?: string;
  taken_at_timestamp?: number;
  ownerUsername?: string;
  owner_username?: string;
  ownerId?: string;
  owner_id?: string;
  owner?: { username?: string; id?: string; full_name?: string };
  ownerFullName?: string;
  type?: string;
  videoViewCount?: number;
  video_view_count?: number;
  hashtags?: string[];
}

/**
 * Map Apify post to our InstagramPost interface
 */
function mapApifyPost(raw: ApifyInstagramPost): InstagramPost {
  return {
    id: raw.id || '',
    shortCode: raw.shortCode || raw.shortcode || '',
    caption: raw.caption || '',
    url: raw.url || '',
    commentsCount: raw.commentsCount || raw.comments_count || raw.edge_media_to_comment?.count || 0,
    likesCount: raw.likesCount || raw.likes_count || raw.edge_liked_by?.count || 0,
    timestamp: raw.timestamp || (raw.taken_at_timestamp ? new Date(raw.taken_at_timestamp * 1000).toISOString() : ''),
    ownerUsername: raw.ownerUsername || raw.owner_username || raw.owner?.username || '',
    ownerId: raw.ownerId || raw.owner_id || raw.owner?.id || '',
    ownerFullName: raw.ownerFullName || raw.owner?.full_name,
    type: raw.type || 'image',
    videoViewCount: raw.videoViewCount || raw.video_view_count,
    hashtags: raw.hashtags,
  };
}

/**
 * Search Instagram by hashtags to find creators
 * Uses hashtags like #businesscoach, #onlinecoach, #lifecoach etc.
 */
export async function searchInstagramByHashtags(
  hashtags: string[],
  maxResults: number = 50
): Promise<InstagramSearchResult[]> {
  const url = `https://api.apify.com/v2/acts/${INSTAGRAM_HASHTAG_SCRAPER}/run-sync-get-dataset-items`;

  try {
    console.log(`[Instagram] Searching hashtags: ${hashtags.join(', ')}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${APIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hashtags: hashtags,
        resultsLimit: maxResults,
        searchType: 'hashtag',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Apify Instagram hashtag search failed: ${response.status} - ${errorText}`);
    }

    const rawPosts = await response.json() as ApifyInstagramPost[];
    console.log(`[Instagram] Received ${rawPosts.length} posts from hashtag search`);

    // Log first post structure for debugging
    if (rawPosts.length > 0) {
      console.log(`[Instagram] Sample post fields:`, Object.keys(rawPosts[0]).join(', '));
      const sample = rawPosts[0];
      console.log(`[Instagram] Sample post owner: ${sample.ownerUsername || sample.owner_username || sample.owner?.username || 'N/A'}`);
    }

    // Map raw posts to our interface
    const posts = rawPosts.map(mapApifyPost);

    // Extract unique users from posts and get their profiles
    const uniqueUsers = new Map<string, InstagramPost[]>();
    for (const post of posts) {
      if (post.ownerUsername) {
        const existing = uniqueUsers.get(post.ownerUsername) || [];
        existing.push(post);
        uniqueUsers.set(post.ownerUsername, existing);
      }
    }

    console.log(`[Instagram] Found ${uniqueUsers.size} unique users from posts`);

    // Get profile details for each unique user
    const usernames = Array.from(uniqueUsers.keys()).slice(0, maxResults);
    const profiles = await getInstagramProfiles(usernames);

    console.log(`[Instagram] Retrieved ${profiles.length} profiles with details`);

    // Combine profile data with post data
    return profiles.map(profile => {
      const userPosts = uniqueUsers.get(profile.username) || [];
      const totalEngagement = userPosts.reduce((sum, p) => sum + (p.likesCount || 0) + (p.commentsCount || 0), 0);
      const engagementRate = profile.followersCount > 0 && userPosts.length > 0
        ? (totalEngagement / userPosts.length / profile.followersCount) * 100
        : 0;

      return {
        username: profile.username,
        userId: profile.id,
        fullName: profile.fullName,
        biography: profile.biography,
        externalUrl: profile.externalUrl,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        postsCount: profile.postsCount,
        isVerified: profile.isVerified,
        isBusinessAccount: profile.isBusinessAccount,
        businessCategoryName: profile.businessCategoryName,
        profilePicUrl: profile.profilePicUrl,
        engagementRate: Math.round(engagementRate * 100) / 100,
        recentPosts: userPosts.slice(0, 5).map(p => ({
          caption: p.caption || '',
          likesCount: p.likesCount || 0,
          commentsCount: p.commentsCount || 0,
          timestamp: p.timestamp || '',
        })),
      };
    });
  } catch (error) {
    console.error('Instagram hashtag search error:', error);
    throw error;
  }
}

// Raw Apify profile response interface (actual field names from Apify)
interface ApifyInstagramProfile {
  id?: string;
  userId?: string;
  username?: string;
  fullName?: string;
  full_name?: string;
  biography?: string;
  bio?: string;
  externalUrl?: string;
  external_url?: string;
  followersCount?: number;
  followers_count?: number;
  edge_followed_by?: { count: number };
  followsCount?: number;
  follows_count?: number;
  edge_follow?: { count: number };
  postsCount?: number;
  posts_count?: number;
  edge_owner_to_timeline_media?: { count: number };
  verified?: boolean;
  isVerified?: boolean;
  is_verified?: boolean;
  isBusinessAccount?: boolean;
  is_business_account?: boolean;
  businessCategoryName?: string;
  business_category_name?: string;
  category_name?: string;
  profilePicUrl?: string;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  // Related profiles (Instagram's "suggested for you")
  relatedProfiles?: Array<{ username?: string; id?: string }>;
  related_profiles?: Array<{ username?: string; id?: string }>;
  edge_related_profiles?: { edges?: Array<{ node?: { username?: string; id?: string } }> };
  similar_accounts?: Array<{ username?: string }>;
}

/**
 * Map Apify response to our InstagramProfile interface
 */
function mapApifyProfile(raw: ApifyInstagramProfile): InstagramProfile {
  // Extract related profiles from various possible formats
  const relatedProfiles: string[] = [];

  if (raw.relatedProfiles) {
    for (const p of raw.relatedProfiles) {
      if (p.username) relatedProfiles.push(p.username);
    }
  }
  if (raw.related_profiles) {
    for (const p of raw.related_profiles) {
      if (p.username) relatedProfiles.push(p.username);
    }
  }
  if (raw.edge_related_profiles?.edges) {
    for (const edge of raw.edge_related_profiles.edges) {
      if (edge.node?.username) relatedProfiles.push(edge.node.username);
    }
  }
  if (raw.similar_accounts) {
    for (const p of raw.similar_accounts) {
      if (p.username) relatedProfiles.push(p.username);
    }
  }

  return {
    id: raw.id || raw.userId || '',
    username: raw.username || '',
    fullName: raw.fullName || raw.full_name || '',
    biography: raw.biography || raw.bio || '',
    externalUrl: raw.externalUrl || raw.external_url || null,
    followersCount: raw.followersCount || raw.followers_count || raw.edge_followed_by?.count || 0,
    followsCount: raw.followsCount || raw.follows_count || raw.edge_follow?.count || 0,
    postsCount: raw.postsCount || raw.posts_count || raw.edge_owner_to_timeline_media?.count || 0,
    isVerified: raw.verified || raw.isVerified || raw.is_verified || false,
    isBusinessAccount: raw.isBusinessAccount || raw.is_business_account || false,
    businessCategoryName: raw.businessCategoryName || raw.business_category_name || raw.category_name,
    profilePicUrl: raw.profilePicUrl || raw.profile_pic_url || raw.profile_pic_url_hd || '',
    relatedProfiles: relatedProfiles.length > 0 ? [...new Set(relatedProfiles)] : undefined,
  };
}

/**
 * Get detailed profile information for Instagram users
 */
export async function getInstagramProfiles(usernames: string[]): Promise<InstagramProfile[]> {
  if (usernames.length === 0) return [];

  const url = `https://api.apify.com/v2/acts/${INSTAGRAM_PROFILE_SCRAPER}/run-sync-get-dataset-items`;

  try {
    console.log(`[Instagram] Fetching profiles for ${usernames.length} users: ${usernames.slice(0, 5).join(', ')}${usernames.length > 5 ? '...' : ''}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${APIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: usernames,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apify Instagram profile scraper failed: ${response.status} - ${errorText}`);
      return [];
    }

    const rawProfiles = await response.json() as ApifyInstagramProfile[];
    console.log(`[Instagram] Received ${rawProfiles.length} profiles from Apify`);

    // Log first profile structure for debugging
    if (rawProfiles.length > 0) {
      console.log(`[Instagram] Sample profile fields:`, Object.keys(rawProfiles[0]).join(', '));
      const sample = rawProfiles[0];
      console.log(`[Instagram] Sample values - username: ${sample.username}, followers: ${sample.followersCount || sample.followers_count || sample.edge_followed_by?.count || 'N/A'}`);
    }

    // Map Apify response to our interface
    const profiles = rawProfiles.map(mapApifyProfile);
    return profiles;
  } catch (error) {
    console.error('Instagram profile scraper error:', error);
    return [];
  }
}

/**
 * Search Instagram directly by keyword using the Instagram API Scraper
 * This is more reliable than the search scraper
 */
export async function searchInstagramProfiles(
  keyword: string,
  maxResults: number = 50
): Promise<InstagramSearchResult[]> {
  // Use the Instagram API Scraper with search functionality
  const searchUrl = `https://api.apify.com/v2/acts/${INSTAGRAM_API_SCRAPER}/run-sync-get-dataset-items`;

  try {
    console.log(`[Instagram] API Scraper search for keyword: "${keyword}"`);

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${APIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search: keyword,
        searchType: 'user',
        resultsLimit: maxResults,
        searchLimit: maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Instagram] API Scraper search failed: ${response.status} - ${errorText}`);
      // Return empty array to fall back to hashtag search
      return [];
    }

    const results = await response.json();
    console.log(`[Instagram] API Scraper returned ${results.length} results`);

    // Log sample result structure for debugging
    if (results.length > 0) {
      console.log(`[Instagram] Sample result fields:`, Object.keys(results[0]).join(', '));
    }

    // The API scraper returns profile data directly in many cases
    // Extract usernames and get full profile details
    const usernames: string[] = [];
    const directProfiles: InstagramSearchResult[] = [];

    for (const result of results) {
      const username = result.username || result.ownerUsername;
      if (username && !usernames.includes(username)) {
        usernames.push(username);

        // If we already have follower data, use it directly
        if (result.followersCount || result.followsCount) {
          directProfiles.push({
            username: result.username,
            userId: result.id || result.pk || '',
            fullName: result.fullName || result.full_name || '',
            biography: result.biography || result.bio || '',
            externalUrl: result.externalUrl || result.external_url || null,
            followersCount: result.followersCount || result.followers_count || 0,
            followsCount: result.followsCount || result.follows_count || 0,
            postsCount: result.postsCount || result.posts_count || result.mediaCount || 0,
            isVerified: result.verified || result.isVerified || false,
            isBusinessAccount: result.isBusinessAccount || result.is_business_account || false,
            businessCategoryName: result.businessCategoryName || result.category || undefined,
            profilePicUrl: result.profilePicUrl || result.profile_pic_url || '',
            engagementRate: 0,
            recentPosts: [],
          });
        }
      }
    }

    console.log(`[Instagram] Found ${usernames.length} unique users, ${directProfiles.length} with full data`);

    // If we got profiles with data, use those
    if (directProfiles.length > 0) {
      return directProfiles.slice(0, maxResults);
    }

    // Otherwise, fetch full profile details
    if (usernames.length === 0) {
      return [];
    }

    const profiles = await getInstagramProfiles(usernames.slice(0, maxResults));

    return profiles.map(profile => ({
      username: profile.username,
      userId: profile.id,
      fullName: profile.fullName,
      biography: profile.biography,
      externalUrl: profile.externalUrl,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount,
      isVerified: profile.isVerified,
      isBusinessAccount: profile.isBusinessAccount,
      businessCategoryName: profile.businessCategoryName,
      profilePicUrl: profile.profilePicUrl,
      engagementRate: 0,
      recentPosts: [],
    }));
  } catch (error) {
    console.error('Instagram API Scraper search error:', error);
    // Return empty array to fall back to hashtag search
    return [];
  }
}

/**
 * Generate coach-specific search terms for Instagram USER search
 * Instead of hashtags, these are actual search queries to find coaches
 */
export function generateCoachSearchTerms(keyword: string): string[] {
  const words = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const searchTerms: string[] = [];
  const mainKeyword = words[0];

  // Coach/mentor specific search terms - these search for USERS, not hashtags
  const coachSuffixes = ['coach', 'mentor', 'educator', 'expert', 'guru', 'pro'];
  for (const suffix of coachSuffixes) {
    searchTerms.push(`${mainKeyword} ${suffix}`);
    searchTerms.push(`${mainKeyword}${suffix}`); // compound version
  }

  // Niche-specific coach search terms
  const nicheSearchTerms: Record<string, string[]> = {
    dropshipping: [
      'dropshipping coach',
      'dropship mentor',
      'ecom coach',
      'ecommerce mentor',
      'shopify coach',
      'shopify mentor',
      'online store coach',
      'ecom educator',
    ],
    amazon: [
      'amazon fba coach',
      'fba mentor',
      'amazon seller coach',
      'amazon expert',
      'fba educator',
    ],
    fba: [
      'fba coach',
      'amazon fba mentor',
      'fba expert',
      'amazon seller mentor',
    ],
    ecommerce: [
      'ecommerce coach',
      'ecom mentor',
      'online business coach',
      'ecom educator',
    ],
    fitness: [
      'fitness coach',
      'online fitness coach',
      'personal trainer',
      'fitness mentor',
      'transformation coach',
    ],
    business: [
      'business coach',
      'business mentor',
      'entrepreneur coach',
      'startup mentor',
    ],
    marketing: [
      'marketing coach',
      'digital marketing mentor',
      'social media coach',
      'marketing expert',
    ],
    real: [
      'real estate coach',
      'realtor mentor',
      'real estate investor',
      'real estate educator',
    ],
    estate: [
      'real estate coach',
      'real estate mentor',
      'property investor coach',
    ],
    crypto: [
      'crypto coach',
      'crypto mentor',
      'bitcoin educator',
      'crypto trading coach',
    ],
    trading: [
      'trading coach',
      'forex mentor',
      'stock trading coach',
      'day trader mentor',
    ],
  };

  // Add niche-specific terms
  for (const word of words) {
    if (nicheSearchTerms[word]) {
      searchTerms.push(...nicheSearchTerms[word]);
    }
  }

  // Remove duplicates and return
  return [...new Set(searchTerms)].slice(0, 15);
}

/**
 * Generate relevant hashtags for a niche keyword
 * Creates hashtags that are actually used on Instagram
 */
export function generateInstagramHashtags(keyword: string): string[] {
  const words = keyword.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const hashtags: string[] = [];

  // Single word or compound (no spaces)
  const compound = words.join('');
  hashtags.push(compound);

  // Add niche-specific suffixes only to the main keyword
  const mainKeyword = words[0]; // e.g., "dropshipping" from "dropshipping tutorial"
  const nicheSuffixes = ['coach', 'mentor', 'tips', 'expert', 'life', 'success'];
  for (const suffix of nicheSuffixes) {
    if (mainKeyword !== suffix) {
      hashtags.push(`${mainKeyword}${suffix}`);
    }
  }

  // If multi-word, also add the main keyword alone
  if (words.length > 1) {
    hashtags.push(mainKeyword);
    // Also try second word if relevant
    if (words[1] && words[1].length > 3) {
      hashtags.push(words[1]);
    }
  }

  // Add niche-specific hashtags based on common keywords
  const nicheHashtags: Record<string, string[]> = {
    dropshipping: ['dropshipping', 'dropship', 'ecommerce', 'shopify', 'onlinestore', 'ecommentor'],
    amazon: ['amazonfba', 'amazonseller', 'fba', 'amazonbusiness', 'amazonselling'],
    fba: ['amazonfba', 'fbalife', 'fbaseller', 'amazonseller', 'fbatips'],
    ecommerce: ['ecommerce', 'ecom', 'onlinebusiness', 'shopify', 'onlinestore'],
    coaching: ['coachlife', 'businesscoaching', 'onlinecoaching', 'coachingbusiness'],
    fitness: ['fitnesscoach', 'personaltrainer', 'fitnessmotivation', 'onlinefitness'],
    business: ['businessowner', 'businesstips', 'businessgrowth', 'entrepreneur'],
    marketing: ['digitalmarketing', 'socialmediamarketing', 'onlinemarketing', 'marketingtips'],
    real: ['realestate', 'realtor', 'realestateinvesting', 'realestateagent'],
    estate: ['realestate', 'realtor', 'realestatecoach', 'realestatelife'],
    crypto: ['crypto', 'cryptocurrency', 'bitcoin', 'cryptotrading', 'cryptoinvestor'],
    trading: ['trading', 'daytrader', 'stockmarket', 'forex', 'tradingtips'],
    default: ['entrepreneur', 'onlinebusiness', 'makemoneyonline'],
  };

  // Add niche-specific hashtags based on keywords
  for (const word of words) {
    if (nicheHashtags[word]) {
      hashtags.push(...nicheHashtags[word]);
    }
  }

  // Add default hashtags if we have few results (but NOT generic coaching ones)
  if (hashtags.length < 5) {
    hashtags.push(...nicheHashtags.default);
  }

  // Remove duplicates and limit to 10
  return [...new Set(hashtags)].slice(0, 10);
}

/**
 * Extract email from Instagram bio
 */
export function extractEmailFromBio(bio: string): string | null {
  if (!bio) return null;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = bio.match(emailRegex);

  if (matches && matches.length > 0) {
    return matches[0];
  }

  return null;
}

/**
 * Search Instagram for coaches/educators using USER SEARCH
 * This searches for users matching coach-specific search terms
 */
export async function searchInstagramCoaches(
  keyword: string,
  maxResults: number = 50
): Promise<InstagramSearchResult[]> {
  const searchTerms = generateCoachSearchTerms(keyword);

  console.log(`[Instagram] Searching for coaches with ${searchTerms.length} search terms: ${searchTerms.slice(0, 5).join(', ')}...`);

  const allProfiles: InstagramSearchResult[] = [];
  const seenUsernames = new Set<string>();

  // Search with each term using the Instagram Scraper
  for (const term of searchTerms) {
    if (allProfiles.length >= maxResults) break;

    try {
      console.log(`[Instagram] User search for: "${term}"`);

      const url = `https://api.apify.com/v2/acts/${INSTAGRAM_SCRAPER}/run-sync-get-dataset-items`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${APIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search: term,
          searchType: 'user',
          resultsLimit: 20, // Get 20 users per search term
        }),
      });

      if (!response.ok) {
        console.log(`[Instagram] Search for "${term}" failed: ${response.status}`);
        continue;
      }

      const results = await response.json();
      console.log(`[Instagram] Search for "${term}" returned ${results.length} results`);

      // Process results
      for (const result of results) {
        const username = result.username || result.ownerUsername;
        if (!username || seenUsernames.has(username)) continue;
        seenUsernames.add(username);

        allProfiles.push({
          username: username,
          userId: result.id || result.pk || result.userId || '',
          fullName: result.fullName || result.full_name || '',
          biography: result.biography || result.bio || '',
          externalUrl: result.externalUrl || result.external_url || null,
          followersCount: result.followersCount || result.followers_count || result.edge_followed_by?.count || 0,
          followsCount: result.followsCount || result.follows_count || result.edge_follow?.count || 0,
          postsCount: result.postsCount || result.posts_count || result.edge_owner_to_timeline_media?.count || 0,
          isVerified: result.verified || result.isVerified || false,
          isBusinessAccount: result.isBusinessAccount || result.is_business_account || false,
          businessCategoryName: result.businessCategoryName || result.category || undefined,
          profilePicUrl: result.profilePicUrl || result.profile_pic_url || '',
          engagementRate: 0,
          recentPosts: [],
        });
      }

      // Small delay between searches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.log(`[Instagram] Error searching for "${term}":`, error);
    }
  }

  console.log(`[Instagram] Coach search found ${allProfiles.length} unique profiles`);

  // If we didn't get enough from user search, supplement with profile details
  if (allProfiles.length > 0 && allProfiles.length < maxResults) {
    // Get full profile details for what we found
    const usernames = allProfiles.map(p => p.username).filter(u => u);
    const detailedProfiles = await getInstagramProfiles(usernames.slice(0, maxResults));

    // Merge detailed data
    for (const detailed of detailedProfiles) {
      const existing = allProfiles.find(p => p.username === detailed.username);
      if (existing) {
        existing.followersCount = detailed.followersCount || existing.followersCount;
        existing.followsCount = detailed.followsCount || existing.followsCount;
        existing.postsCount = detailed.postsCount || existing.postsCount;
        existing.biography = detailed.biography || existing.biography;
        existing.externalUrl = detailed.externalUrl || existing.externalUrl;
        existing.isBusinessAccount = detailed.isBusinessAccount || existing.isBusinessAccount;
      }
    }
  }

  return allProfiles.slice(0, maxResults);
}

/**
 * Search Instagram by seed accounts - finds related profiles similar to the seeds
 * This is more effective than hashtag search because Instagram's algorithm
 * suggests accounts with similar content and audience.
 *
 * @param seedUsernames - Array of Instagram usernames to use as seeds (e.g., known coaches)
 * @param maxResults - Maximum number of related profiles to return
 * @returns Array of InstagramSearchResult for related profiles
 */
export async function searchInstagramBySeedAccounts(
  seedUsernames: string[],
  maxResults: number = 50
): Promise<InstagramSearchResult[]> {
  if (seedUsernames.length === 0) {
    console.log('[Instagram] No seed usernames provided');
    return [];
  }

  try {
    // Clean up usernames (remove @ prefix if present)
    const cleanedSeeds = seedUsernames.map(u => u.replace(/^@/, '').trim()).filter(u => u.length > 0);

    console.log(`[Instagram] Seed search with ${cleanedSeeds.length} seed accounts: ${cleanedSeeds.join(', ')}`);

    // Step 1: Get profiles for seed accounts (this should include related profiles)
    const seedProfiles = await getInstagramProfiles(cleanedSeeds);
    console.log(`[Instagram] Retrieved ${seedProfiles.length} seed profiles`);

    // Step 2: Collect all related profiles from seeds
    const relatedUsernames = new Set<string>();
    for (const profile of seedProfiles) {
      console.log(`[Instagram] Seed @${profile.username} has ${profile.relatedProfiles?.length || 0} related profiles`);
      if (profile.relatedProfiles) {
        for (const related of profile.relatedProfiles) {
          // Don't include the seed accounts themselves
          if (!cleanedSeeds.includes(related.toLowerCase())) {
            relatedUsernames.add(related);
          }
        }
      }
    }

    console.log(`[Instagram] Found ${relatedUsernames.size} unique related profiles from seeds`);

    // If we didn't get related profiles from the profile scraper,
    // try using the dedicated related profiles scraper
    if (relatedUsernames.size === 0) {
      console.log('[Instagram] No related profiles found, trying dedicated related profiles scraper...');
      const relatedFromScraper = await scrapeRelatedProfiles(cleanedSeeds, maxResults);
      for (const username of relatedFromScraper) {
        if (!cleanedSeeds.includes(username.toLowerCase())) {
          relatedUsernames.add(username);
        }
      }
      console.log(`[Instagram] Related profiles scraper found ${relatedUsernames.size} profiles`);
    }

    if (relatedUsernames.size === 0) {
      console.log('[Instagram] No related profiles found from any source');
      return [];
    }

    // Step 3: Get full profile details for related accounts
    const usernamesToFetch = Array.from(relatedUsernames).slice(0, maxResults);
    console.log(`[Instagram] Fetching details for ${usernamesToFetch.length} related profiles`);

    const relatedProfiles = await getInstagramProfiles(usernamesToFetch);

    // Convert to search results
    return relatedProfiles.map(profile => ({
      username: profile.username,
      userId: profile.id,
      fullName: profile.fullName,
      biography: profile.biography,
      externalUrl: profile.externalUrl,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      postsCount: profile.postsCount,
      isVerified: profile.isVerified,
      isBusinessAccount: profile.isBusinessAccount,
      businessCategoryName: profile.businessCategoryName,
      profilePicUrl: profile.profilePicUrl,
      engagementRate: 0,
      recentPosts: [],
    }));
  } catch (error) {
    console.error('[Instagram] Seed account search error:', error);
    throw error;
  }
}

/**
 * Scrape related/suggested profiles using dedicated Apify actor
 */
async function scrapeRelatedProfiles(seedUsernames: string[], maxResults: number): Promise<string[]> {
  // Try the Instagram Related Person Scraper
  const RELATED_PROFILES_SCRAPER = 'api-empire~instagram-related-person-scraper';
  const url = `https://api.apify.com/v2/acts/${RELATED_PROFILES_SCRAPER}/run-sync-get-dataset-items`;

  try {
    console.log(`[Instagram] Using related profiles scraper for: ${seedUsernames.join(', ')}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${APIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernames: seedUsernames,
        resultsLimit: maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[Instagram] Related profiles scraper failed: ${response.status} - ${errorText.slice(0, 200)}`);
      // Fall back to profile scraper
      return [];
    }

    const results = await response.json();
    console.log(`[Instagram] Related profiles scraper returned ${results.length} items`);

    // Log structure for debugging
    if (results.length > 0) {
      console.log(`[Instagram] Sample result fields:`, Object.keys(results[0]).join(', '));
    }

    // Extract usernames from results
    const usernames: string[] = [];
    for (const result of results) {
      const username = result.username || result.user?.username;
      if (username && !seedUsernames.includes(username.toLowerCase())) {
        usernames.push(username);
      }
    }

    return [...new Set(usernames)];
  } catch (error) {
    console.log(`[Instagram] Related profiles scraper error:`, error);
    return [];
  }
}
