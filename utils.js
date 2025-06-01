/**
 * Utility functions for YouTube Monitor Extension
 */

/**
 * Check if URL is a YouTube homepage
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is YouTube homepage
 */
export function isYouTubeHomepage(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.youtube.com' && urlObj.pathname === '/';
  } catch (e) {
    return false;
  }
}

/**
 * Check if URL is a YouTube channel page
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is a YouTube channel page
 */
export function isYouTubeChannel(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.youtube.com' && 
           (urlObj.pathname.startsWith('/@') || urlObj.pathname.startsWith('/channel/'));
  } catch (e) {
    return false;
  }
}

/**
 * Check if URL is a YouTube video page
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is a YouTube video page
 */
export function isYouTubeVideo(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.youtube.com' && urlObj.pathname === '/watch';
  } catch (e) {
    return false;
  }
}

/**
 * Extract channel ID from YouTube channel URL
 * @param {string} url - The YouTube channel URL
 * @returns {string|null} Channel ID or null if not found
 */
export function extractChannelIdFromUrl(url) {
  try {
    const urlObj = new URL(url);
    // /channel/UCxxxxxxx
    if (urlObj.pathname.startsWith('/channel/')) {
      return urlObj.pathname.split('/')[2];
    }
    // /@username: need to fetch canonical channel ID (not implemented here)
    // Optionally, return the username for further lookup
    if (urlObj.pathname.startsWith('/@')) {
      return urlObj.pathname.substring(2); // This is the username, not the ID
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if a channel is in the allowed list by ID
 * @param {string} channelId - The channel ID to check
 * @param {Array} allowedChannels - Array of allowed channel objects {id, name}
 * @returns {boolean} True if channel is allowed
 */
export function isChannelAllowed(channelId, allowedChannels) {
  if (!channelId || !allowedChannels || !Array.isArray(allowedChannels)) {
    return false;
  }
  return allowedChannels.some(channel => channel.id === channelId);
}

/**
 * Check if text contains inappropriate keywords
 * @param {string} text - The text to check
 * @returns {string|null} The found keyword or null if none found
 */
export function containsInappropriateContent(text) {
  if (!text) return null;
  
  const keywords = [
    'porn', 'xxx', 'fuck', 'sex', 'adult content', 
    'nudity', 'naked', 'nsfw', 'obscene'
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }
  
  return null;
}

/**
 * Format date for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString();
  } catch (e) {
    return isoString;
  }
}

/**
 * Get default settings
 * @returns {Object} Default settings object
 */
export function getDefaultSettings() {
  return {
    enableShortsFilter: true,
    enableChannelFilter: true,
    enableKeywordFilter: true,
    enableLogging: true
  };
}

/**
 * Get default allowed channels (by ID and name)
 * @returns {Array} Default allowed channels
 */
export function getDefaultAllowedChannels() {
  return [
    { id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', name: 'GoogleDevelopers' },
    { id: 'UC4JX40jDee_tINbkjycV4Sg', name: 'TechWithTim' },
    { id: 'UCsBjURrPoezykLs9EqgamOA', name: 'Fireship' }
  ];
}
