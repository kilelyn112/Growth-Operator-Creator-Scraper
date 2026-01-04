const APIFY_API_KEY = process.env.APIFY_API_KEY || '';

// Apify Actor IDs for Instagram (use ~ separator for public actors)
const INSTAGRAM_HASHTAG_SCRAPER = 'apify~instagram-hashtag-scraper';
const INSTAGRAM_PROFILE_SCRAPER = 'apify~instagram-profile-scraper';

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
}

/**
 * Map Apify response to our InstagramProfile interface
 */
function mapApifyProfile(raw: ApifyInstagramProfile): InstagramProfile {
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
 * Search Instagram directly by keyword (searches profiles)
 */
export async function searchInstagramProfiles(
  keyword: string,
  maxResults: number = 50
): Promise<InstagramSearchResult[]> {
  // First search for profiles using the search scraper
  const searchUrl = `https://api.apify.com/v2/acts/apify~instagram-search-scraper/run-sync-get-dataset-items`;

  try {
    console.log(`[Instagram] Profile search for keyword: "${keyword}"`);

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Instagram] Profile search failed: ${response.status} - ${errorText}`);
      // Return empty array instead of throwing, so we can fall back to hashtag search
      return [];
    }

    const results = await response.json();
    console.log(`[Instagram] Profile search returned ${results.length} results`);

    // Log sample result structure
    if (results.length > 0) {
      console.log(`[Instagram] Sample search result fields:`, Object.keys(results[0]).join(', '));
    }

    // Get detailed profiles for each result
    const usernames = results
      .filter((r: { username?: string }) => r.username)
      .map((r: { username: string }) => r.username)
      .slice(0, maxResults);

    console.log(`[Instagram] Found ${usernames.length} usernames to fetch profiles for`);

    if (usernames.length === 0) {
      return [];
    }

    const profiles = await getInstagramProfiles(usernames);

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
      engagementRate: 0, // Would need to calculate from posts
      recentPosts: [],
    }));
  } catch (error) {
    console.error('Instagram profile search error:', error);
    // Return empty array instead of throwing, so we can fall back to hashtag search
    return [];
  }
}

/**
 * Generate relevant hashtags for a niche keyword
 */
export function generateInstagramHashtags(keyword: string): string[] {
  const baseKeyword = keyword.toLowerCase().replace(/\s+/g, '');

  // Common coaching/consultant hashtag patterns
  const patterns = [
    baseKeyword,
    `${baseKeyword}coach`,
    `${baseKeyword}coaching`,
    `${baseKeyword}mentor`,
    `${baseKeyword}expert`,
    `${baseKeyword}tips`,
    `${baseKeyword}advice`,
    `${baseKeyword}consultant`,
    `${baseKeyword}training`,
  ];

  // Add general coaching hashtags
  const generalHashtags = [
    'businesscoach',
    'onlinecoach',
    'lifecoach',
    'coach',
    'coaching',
    'mentor',
    'consultant',
    'entrepreneur',
    'onlinebusiness',
    'digitalmarketing',
  ];

  // Combine and filter unique
  const combined = [...patterns, ...generalHashtags];
  return [...new Set(combined)].slice(0, 10);
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
