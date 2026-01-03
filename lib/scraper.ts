import { searchYouTubeChannels, scrapeChannelEmail } from './apify';
import { getChannelDetails, getRecentVideos } from './youtube';
import { qualifyCreator } from './openai';
import { createJob, updateJobStatus, addCreator, getJob } from './db';
import { v4 as uuidv4 } from 'uuid';

const MIN_SUBSCRIBERS = 2000;
const MIN_VIDEOS = 5;

export interface SearchJobInput {
  keyword: string;
  maxResults: number;
}

/**
 * Start a new search job - creates the job and returns immediately
 * The actual processing happens asynchronously
 */
export function startSearchJob(input: SearchJobInput): string {
  const jobId = uuidv4();
  createJob(jobId, input.keyword, input.maxResults);

  // Start processing in the background (non-blocking)
  processSearchJob(jobId, input.keyword, input.maxResults).catch((error) => {
    console.error(`Job ${jobId} failed:`, error);
    updateJobStatus(jobId, 'failed', undefined, undefined, error.message);
  });

  return jobId;
}

/**
 * Process a search job - this runs asynchronously
 */
async function processSearchJob(
  jobId: string,
  keyword: string,
  maxResults: number
): Promise<void> {
  try {
    updateJobStatus(jobId, 'processing');

    // Step 1: Search YouTube channels via Apify
    console.log(`[${jobId}] Searching for channels with keyword: ${keyword}`);
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

        // Save to database
        addCreator({
          job_id: jobId,
          channel_id: channel.channelId,
          channel_name: channel.channelName,
          channel_url: channel.channelUrl,
          subscribers: channelDetails.subscriberCount,
          video_count: channelDetails.videoCount,
          total_views: channelDetails.viewCount,
          qualified: qualification.qualified,
          qualification_reason: qualification.reason,
          email: email,
          first_name: null, // Can add later
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
    console.log(`[${jobId}] Job completed successfully`);
  } catch (error) {
    console.error(`[${jobId}] Job failed:`, error);
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
