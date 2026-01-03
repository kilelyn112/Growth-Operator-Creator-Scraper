const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

export interface ChannelDetails {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  uploadsPlaylistId: string;
}

export interface VideoDetails {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
}

/**
 * Get channel details by channel ID
 */
export async function getChannelDetails(channelId: string): Promise<ChannelDetails | null> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`YouTube API error for channel ${channelId}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const channel = data.items[0];
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description || '',
      subscriberCount: parseInt(channel.statistics.subscriberCount || '0', 10),
      viewCount: parseInt(channel.statistics.viewCount || '0', 10),
      videoCount: parseInt(channel.statistics.videoCount || '0', 10),
      uploadsPlaylistId: channel.contentDetails.relatedPlaylists.uploads,
    };
  } catch (error) {
    console.error(`Error fetching channel ${channelId}:`, error);
    return null;
  }
}

/**
 * Get recent videos from a channel's uploads playlist
 */
export async function getRecentVideos(
  playlistId: string,
  maxResults: number = 10
): Promise<VideoDetails[]> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`YouTube API error for playlist ${playlistId}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: { contentDetails: { videoId: string }, snippet: { title: string, description: string, publishedAt: string } }) => ({
      id: item.contentDetails.videoId,
      title: item.snippet.title,
      description: item.snippet.description || '',
      publishedAt: item.snippet.publishedAt,
    }));
  } catch (error) {
    console.error(`Error fetching playlist ${playlistId}:`, error);
    return [];
  }
}
