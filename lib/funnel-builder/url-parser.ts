/**
 * Parse creator URLs and extract platform + identifier
 */

export interface ParsedCreatorUrl {
  platform: 'youtube' | 'instagram';
  identifier: string; // channel ID, username, or handle
  type: 'channel_id' | 'handle' | 'username' | 'custom_url';
}

/**
 * Parse a YouTube or Instagram URL into platform + identifier
 */
export function parseCreatorUrl(url: string): ParsedCreatorUrl | null {
  const trimmed = url.trim();

  // Try YouTube patterns
  const ytResult = parseYouTubeUrl(trimmed);
  if (ytResult) return ytResult;

  // Try Instagram patterns
  const igResult = parseInstagramUrl(trimmed);
  if (igResult) return igResult;

  // If it looks like a plain username, assume Instagram
  if (/^@?[a-zA-Z0-9._]+$/.test(trimmed)) {
    return {
      platform: 'instagram',
      identifier: trimmed.replace(/^@/, ''),
      type: 'username',
    };
  }

  return null;
}

function parseYouTubeUrl(url: string): ParsedCreatorUrl | null {
  // youtube.com/channel/UCxxxxx
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return { platform: 'youtube', identifier: channelMatch[1], type: 'channel_id' };
  }

  // youtube.com/@handle
  const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    return { platform: 'youtube', identifier: handleMatch[1], type: 'handle' };
  }

  // youtube.com/c/CustomName or youtube.com/user/Username
  const customMatch = url.match(/youtube\.com\/(?:c|user)\/([a-zA-Z0-9_.-]+)/);
  if (customMatch) {
    return { platform: 'youtube', identifier: customMatch[1], type: 'custom_url' };
  }

  // youtu.be or youtube.com with just a path that could be a handle
  const shortMatch = url.match(/youtube\.com\/([a-zA-Z0-9_.-]+)\/?$/);
  if (shortMatch && !['watch', 'playlist', 'feed', 'results', 'shorts'].includes(shortMatch[1])) {
    return { platform: 'youtube', identifier: shortMatch[1], type: 'custom_url' };
  }

  return null;
}

function parseInstagramUrl(url: string): ParsedCreatorUrl | null {
  // instagram.com/username or instagram.com/username/
  const igMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?(?:\?.*)?$/);
  if (igMatch && !['p', 'reel', 'stories', 'explore', 'accounts', 'direct'].includes(igMatch[1])) {
    return { platform: 'instagram', identifier: igMatch[1], type: 'username' };
  }

  return null;
}
