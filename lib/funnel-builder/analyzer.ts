/**
 * Creator Analyzer — Scrapes a creator's content and produces a structured analysis
 * using GPT-4o. This analysis feeds into the funnel generator.
 */

import OpenAI from 'openai';
import { getChannelDetails, getRecentVideos, type ChannelDetails, type VideoDetails } from '../youtube';
import { getInstagramProfiles, type InstagramProfile } from '../instagram';
import { parseCreatorUrl, type ParsedCreatorUrl } from './url-parser';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

export interface CreatorAnalysis {
  platform: 'youtube' | 'instagram';
  source_url: string;
  // Basic info
  name: string;
  username: string;
  bio: string;
  profile_url: string;
  followers: number;
  // AI analysis
  niche: string;
  sub_niche: string;
  target_audience: string;
  audience_pain_points: string[];
  audience_desires: string[];
  content_themes: string[];
  tone_of_voice: string;
  identified_offers: string[];
  unique_selling_proposition: string;
  credibility_markers: string[];
  content_style: string;
  // Raw data for funnel generation
  raw_videos?: { title: string; description: string }[];
  raw_posts?: { caption: string }[];
}

/**
 * Main entry point — analyze a creator from their URL
 */
export async function analyzeCreator(url: string): Promise<CreatorAnalysis> {
  const parsed = parseCreatorUrl(url);
  if (!parsed) {
    throw new Error('Could not parse URL. Please provide a valid YouTube or Instagram URL.');
  }

  if (parsed.platform === 'youtube') {
    return analyzeYouTubeCreator(parsed, url);
  } else {
    return analyzeInstagramCreator(parsed, url);
  }
}

/**
 * Analyze a YouTube creator
 */
async function analyzeYouTubeCreator(parsed: ParsedCreatorUrl, originalUrl: string): Promise<CreatorAnalysis> {
  // Resolve channel ID from handle/custom URL if needed
  let channelId = parsed.identifier;

  if (parsed.type === 'handle' || parsed.type === 'custom_url') {
    channelId = await resolveYouTubeChannelId(parsed.identifier, parsed.type);
  }

  // Fetch channel details
  const channel = await getChannelDetails(channelId);
  if (!channel) {
    throw new Error(`Could not find YouTube channel: ${parsed.identifier}`);
  }

  // Fetch recent videos
  const videos = await getRecentVideos(channel.uploadsPlaylistId, 15);

  // Run AI analysis
  const analysis = await analyzeYouTubeWithAI(channel, videos);

  return {
    platform: 'youtube',
    source_url: originalUrl,
    name: channel.title,
    username: parsed.identifier,
    bio: channel.description,
    profile_url: `https://youtube.com/channel/${channel.id}`,
    followers: channel.subscriberCount,
    raw_videos: videos.map(v => ({ title: v.title, description: v.description.slice(0, 500) })),
    ...analysis,
  };
}

/**
 * Analyze an Instagram creator
 */
async function analyzeInstagramCreator(parsed: ParsedCreatorUrl, originalUrl: string): Promise<CreatorAnalysis> {
  const profiles = await getInstagramProfiles([parsed.identifier]);

  if (!profiles || profiles.length === 0) {
    throw new Error(`Could not find Instagram profile: @${parsed.identifier}`);
  }

  const profile = profiles[0];

  // Run AI analysis
  const analysis = await analyzeInstagramWithAI(profile);

  return {
    platform: 'instagram',
    source_url: originalUrl,
    name: profile.fullName || profile.username,
    username: profile.username,
    bio: profile.biography || '',
    profile_url: `https://instagram.com/${profile.username}`,
    followers: profile.followersCount,
    raw_posts: profile.recentPosts?.map(p => ({ caption: p.caption || '' })) || [],
    ...analysis,
  };
}

/**
 * Resolve a YouTube handle or custom URL to a channel ID
 */
async function resolveYouTubeChannelId(identifier: string, type: 'handle' | 'custom_url'): Promise<string> {
  const searchParam = type === 'handle' ? `@${identifier}` : identifier;

  // Use YouTube search to find the channel
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(searchParam)}&maxResults=1&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`YouTube search failed: ${response.status}`);

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    }

    // Fallback: try forHandle parameter
    const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(identifier)}&key=${YOUTUBE_API_KEY}`;
    const handleResponse = await fetch(handleUrl);
    if (handleResponse.ok) {
      const handleData = await handleResponse.json();
      if (handleData.items && handleData.items.length > 0) {
        return handleData.items[0].id;
      }
    }

    throw new Error(`Could not resolve YouTube channel: ${identifier}`);
  } catch (error) {
    throw new Error(`Failed to find YouTube channel "${identifier}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============ AI ANALYSIS ============

interface AIAnalysisResult {
  niche: string;
  sub_niche: string;
  target_audience: string;
  audience_pain_points: string[];
  audience_desires: string[];
  content_themes: string[];
  tone_of_voice: string;
  identified_offers: string[];
  unique_selling_proposition: string;
  credibility_markers: string[];
  content_style: string;
}

const ANALYZER_SYSTEM_PROMPT = `You are an expert marketing strategist and funnel builder. You analyze content creators to deeply understand their brand, audience, and business so that a high-converting sales funnel can be built for them.

You return structured JSON analysis. Be specific and actionable — not generic. Pull real insights from the content provided.`;

async function analyzeYouTubeWithAI(channel: ChannelDetails, videos: VideoDetails[]): Promise<AIAnalysisResult> {
  const videoList = videos
    .slice(0, 15)
    .map((v, i) => `${i + 1}. "${v.title}" — ${v.description.slice(0, 300)}`)
    .join('\n');

  const prompt = `Analyze this YouTube creator for funnel building purposes.

CHANNEL: ${channel.title}
SUBSCRIBERS: ${channel.subscriberCount.toLocaleString()}
TOTAL VIEWS: ${channel.viewCount.toLocaleString()}
ABOUT: ${channel.description}

RECENT VIDEOS:
${videoList}

---

Analyze this creator and return JSON with these exact fields:

{
  "niche": "Their primary niche (e.g., 'ecommerce', 'fitness coaching', 'real estate investing')",
  "sub_niche": "Their specific sub-niche (e.g., 'Shopify dropshipping for beginners', 'body recomposition for busy professionals')",
  "target_audience": "Who their ideal viewer/customer is — be specific about demographics, situation, goals",
  "audience_pain_points": ["5 specific pain points their audience has based on the content"],
  "audience_desires": ["5 specific desires/outcomes their audience wants"],
  "content_themes": ["The 5 main themes/topics they cover repeatedly"],
  "tone_of_voice": "How they communicate — formal/casual, motivational/tactical, etc. with examples",
  "identified_offers": ["Any products, courses, coaching, communities, or services they seem to offer or could offer"],
  "unique_selling_proposition": "What makes THIS creator different from others in the same niche — their unique angle",
  "credibility_markers": ["Specific results, achievements, or proof points that give them authority"],
  "content_style": "How they deliver content — talking head, tutorials, screen share, storytelling, etc."
}`;

  return runAnalysis(prompt);
}

async function analyzeInstagramWithAI(profile: InstagramProfile): Promise<AIAnalysisResult> {
  const posts = profile.recentPosts
    ?.slice(0, 10)
    .map((p, i) => `${i + 1}. ${p.caption?.slice(0, 300) || 'No caption'}`)
    .join('\n') || 'No recent posts available';

  const prompt = `Analyze this Instagram creator for funnel building purposes.

USERNAME: @${profile.username}
NAME: ${profile.fullName}
FOLLOWERS: ${profile.followersCount.toLocaleString()}
BIO: ${profile.biography}
EXTERNAL URL: ${profile.externalUrl || 'None'}
BUSINESS ACCOUNT: ${profile.isBusinessAccount ? 'Yes' : 'No'}
CATEGORY: ${profile.businessCategoryName || 'N/A'}

RECENT POSTS:
${posts}

---

Analyze this creator and return JSON with these exact fields:

{
  "niche": "Their primary niche (e.g., 'ecommerce', 'fitness coaching', 'real estate investing')",
  "sub_niche": "Their specific sub-niche (e.g., 'Shopify dropshipping for beginners', 'body recomposition for busy professionals')",
  "target_audience": "Who their ideal follower/customer is — be specific about demographics, situation, goals",
  "audience_pain_points": ["5 specific pain points their audience has based on the content"],
  "audience_desires": ["5 specific desires/outcomes their audience wants"],
  "content_themes": ["The 5 main themes/topics they cover repeatedly"],
  "tone_of_voice": "How they communicate — formal/casual, motivational/tactical, etc. with examples",
  "identified_offers": ["Any products, courses, coaching, communities, or services they seem to offer or could offer"],
  "unique_selling_proposition": "What makes THIS creator different from others in the same niche — their unique angle",
  "credibility_markers": ["Specific results, achievements, or proof points that give them authority"],
  "content_style": "How they deliver content — carousels, reels, stories, long captions, etc."
}`;

  return runAnalysis(prompt);
}

async function runAnalysis(prompt: string): Promise<AIAnalysisResult> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: ANALYZER_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI analyzer');

  return JSON.parse(content) as AIAnalysisResult;
}
