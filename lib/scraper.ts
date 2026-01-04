import { searchYouTubeChannels, scrapeChannelEmail } from './apify';
import { getChannelDetails, getRecentVideos } from './youtube';
import { searchInstagramByHashtags, searchInstagramProfiles, generateInstagramHashtags, extractEmailFromBio } from './instagram';
import { qualifyCreator, qualifyInstagramCreator } from './openai';
import { createJob, updateJobStatus, addCreator, getJob, Platform } from './db';
import { v4 as uuidv4 } from 'uuid';

// YouTube thresholds
const MIN_SUBSCRIBERS = 2000;
const MIN_VIDEOS = 5;

// Instagram thresholds
const MIN_FOLLOWERS = 1000;
const MIN_POSTS = 10;

export interface SearchJobInput {
  keyword: string;
  maxResults: number;
  platform: Platform;
}

/**
 * Start a new search job - creates the job and returns immediately
 * The actual processing happens asynchronously
 */
export function startSearchJob(input: SearchJobInput): string {
  const jobId = uuidv4();
  const platform = input.platform || 'youtube';
  createJob(jobId, input.keyword, input.maxResults, platform);

  // Start processing in the background based on platform
  if (platform === 'instagram') {
    processInstagramJob(jobId, input.keyword, input.maxResults).catch((error) => {
      console.error(`Instagram Job ${jobId} failed:`, error);
      updateJobStatus(jobId, 'failed', undefined, undefined, error.message);
    });
  } else {
    // Default to YouTube
    processYouTubeJob(jobId, input.keyword, input.maxResults).catch((error) => {
      console.error(`YouTube Job ${jobId} failed:`, error);
      updateJobStatus(jobId, 'failed', undefined, undefined, error.message);
    });
  }

  return jobId;
}

/**
 * Process a YouTube search job - this runs asynchronously
 */
async function processYouTubeJob(
  jobId: string,
  keyword: string,
  maxResults: number
): Promise<void> {
  try {
    updateJobStatus(jobId, 'processing');

    // Step 1: Search YouTube channels via Apify
    console.log(`[${jobId}] Searching YouTube for channels with keyword: ${keyword}`);
    const searchResults = await searchYouTubeChannels(keyword, maxResults);
    console.log(`[${jobId}] Found ${searchResults.length} channels`);

    // Deduplicate by channel ID
    const uniqueChannels = new Map<string, typeof searchResults[0]>();
    for (const result of searchResults) {
      if (result.channelId && !uniqueChannels.has(result.channelId)) {
        uniqueChannels.set(result.channelId, result);
      }
    }

    const channels = Array.from(uniqueChannels.values());
    updateJobStatus(jobId, 'processing', 0, channels.length);

    // Step 2: Process each channel
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];

      // Check if job was cancelled or failed
      const currentJob = getJob(jobId);
      if (currentJob?.status === 'failed') {
        console.log(`[${jobId}] Job was cancelled, stopping processing`);
        return;
      }

      console.log(`[${jobId}] Processing channel ${i + 1}/${channels.length}: ${channel.channelName}`);

      try {
        // Pre-filter by subscriber count from Apify data
        if (channel.numberOfSubscribers < MIN_SUBSCRIBERS) {
          console.log(`[${jobId}] Skipping ${channel.channelName} - only ${channel.numberOfSubscribers} subscribers`);
          updateJobStatus(jobId, 'processing', i + 1, channels.length);
          continue;
        }

        // Get detailed channel info from YouTube API
        const channelDetails = await getChannelDetails(channel.channelId);
        if (!channelDetails) {
          console.log(`[${jobId}] Could not get details for ${channel.channelName}`);
          updateJobStatus(jobId, 'processing', i + 1, channels.length);
          continue;
        }

        // Filter by video count
        if (channelDetails.videoCount < MIN_VIDEOS) {
          console.log(`[${jobId}] Skipping ${channel.channelName} - only ${channelDetails.videoCount} videos`);
          updateJobStatus(jobId, 'processing', i + 1, channels.length);
          continue;
        }

        // Get recent videos for AI analysis
        const videos = await getRecentVideos(channelDetails.uploadsPlaylistId, 10);

        // AI Qualification
        const qualification = await qualifyCreator(
          channelDetails,
          videos,
          channel.descriptionLinks
        );

        console.log(`[${jobId}] ${channel.channelName}: qualified=${qualification.qualified}`);

        // Scrape email if qualified
        let email: string | null = null;
        if (qualification.qualified) {
          const channelUrl = `${channel.channelUrl}/videos`;
          const emailResult = await scrapeChannelEmail(channelUrl);
          if (emailResult.email.length > 0) {
            email = emailResult.email[0];
            console.log(`[${jobId}] Found email for ${channel.channelName}: ${email}`);
          }
        }

        // Save to database with new schema
        addCreator({
          job_id: jobId,
          platform: 'youtube',
          platform_id: channel.channelId,
          username: null,
          display_name: channel.channelName,
          profile_url: channel.channelUrl,
          followers: channelDetails.subscriberCount,
          following: 0,
          post_count: channelDetails.videoCount,
          total_views: channelDetails.viewCount,
          engagement_rate: 0,
          bio: channelDetails.description || null,
          external_url: null,
          qualified: qualification.qualified,
          qualification_reason: qualification.reason,
          email: email,
          first_name: null,
        });

        updateJobStatus(jobId, 'processing', i + 1, channels.length);

        // Small delay to avoid rate limiting
        await sleep(500);
      } catch (error) {
        console.error(`[${jobId}] Error processing channel ${channel.channelName}:`, error);
        // Continue with next channel
        updateJobStatus(jobId, 'processing', i + 1, channels.length);
      }
    }

    // Mark job as complete
    updateJobStatus(jobId, 'completed', channels.length, channels.length);
    console.log(`[${jobId}] YouTube job completed successfully`);
  } catch (error) {
    console.error(`[${jobId}] YouTube job failed:`, error);
    updateJobStatus(
      jobId,
      'failed',
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Process an Instagram search job - this runs asynchronously
 */
async function processInstagramJob(
  jobId: string,
  keyword: string,
  maxResults: number
): Promise<void> {
  try {
    updateJobStatus(jobId, 'processing');

    // Step 1: Try profile search first (direct keyword search for users)
    console.log(`[${jobId}] Searching Instagram profiles for keyword: ${keyword}`);
    let searchResults = await searchInstagramProfiles(keyword, maxResults);

    // Step 2: If profile search didn't return enough results, also try hashtag search
    if (searchResults.length < maxResults / 2) {
      console.log(`[${jobId}] Profile search found ${searchResults.length} results, also trying hashtag search...`);
      const hashtags = generateInstagramHashtags(keyword);
      console.log(`[${jobId}] Searching Instagram with hashtags: ${hashtags.join(', ')}`);
      const hashtagResults = await searchInstagramByHashtags(hashtags, maxResults);

      // Combine results, avoiding duplicates
      const existingUsernames = new Set(searchResults.map(r => r.username));
      for (const result of hashtagResults) {
        if (!existingUsernames.has(result.username)) {
          searchResults.push(result);
          existingUsernames.add(result.username);
        }
      }
    }

    console.log(`[${jobId}] Found ${searchResults.length} total Instagram profiles`);

    // Deduplicate by username
    const uniqueProfiles = new Map<string, typeof searchResults[0]>();
    for (const result of searchResults) {
      if (result.username && !uniqueProfiles.has(result.username)) {
        uniqueProfiles.set(result.username, result);
      }
    }

    const profiles = Array.from(uniqueProfiles.values());
    updateJobStatus(jobId, 'processing', 0, profiles.length);

    // Step 3: Process each profile
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];

      // Check if job was cancelled or failed
      const currentJob = getJob(jobId);
      if (currentJob?.status === 'failed') {
        console.log(`[${jobId}] Job was cancelled, stopping processing`);
        return;
      }

      console.log(`[${jobId}] Processing Instagram profile ${i + 1}/${profiles.length}: @${profile.username}`);

      try {
        // Pre-filter by follower count
        if (profile.followersCount < MIN_FOLLOWERS) {
          console.log(`[${jobId}] Skipping @${profile.username} - only ${profile.followersCount} followers`);
          updateJobStatus(jobId, 'processing', i + 1, profiles.length);
          continue;
        }

        // Pre-filter by post count
        if (profile.postsCount < MIN_POSTS) {
          console.log(`[${jobId}] Skipping @${profile.username} - only ${profile.postsCount} posts`);
          updateJobStatus(jobId, 'processing', i + 1, profiles.length);
          continue;
        }

        // AI Qualification
        const qualification = await qualifyInstagramCreator(profile);

        console.log(`[${jobId}] @${profile.username}: qualified=${qualification.qualified}`);

        // Try to extract email from bio
        let email: string | null = null;
        if (qualification.qualified) {
          email = extractEmailFromBio(profile.biography || '');
          if (email) {
            console.log(`[${jobId}] Found email for @${profile.username}: ${email}`);
          }
        }

        // Extract first name from full name
        const firstName = profile.fullName ? profile.fullName.split(' ')[0] : null;

        // Save to database
        addCreator({
          job_id: jobId,
          platform: 'instagram',
          platform_id: profile.userId,
          username: profile.username,
          display_name: profile.fullName || profile.username,
          profile_url: `https://instagram.com/${profile.username}`,
          followers: profile.followersCount,
          following: profile.followsCount,
          post_count: profile.postsCount,
          total_views: 0, // Instagram doesn't expose total views
          engagement_rate: profile.engagementRate,
          bio: profile.biography || null,
          external_url: profile.externalUrl || null,
          qualified: qualification.qualified,
          qualification_reason: qualification.reason,
          email: email,
          first_name: firstName,
        });

        updateJobStatus(jobId, 'processing', i + 1, profiles.length);

        // Small delay to avoid rate limiting
        await sleep(500);
      } catch (error) {
        console.error(`[${jobId}] Error processing Instagram profile @${profile.username}:`, error);
        // Continue with next profile
        updateJobStatus(jobId, 'processing', i + 1, profiles.length);
      }
    }

    // Mark job as complete
    updateJobStatus(jobId, 'completed', profiles.length, profiles.length);
    console.log(`[${jobId}] Instagram job completed successfully`);
  } catch (error) {
    console.error(`[${jobId}] Instagram job failed:`, error);
    updateJobStatus(
      jobId,
      'failed',
      undefined,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
