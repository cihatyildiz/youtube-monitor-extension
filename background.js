// Listen for SPA navigation messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'spaNavigation' && message.url) {
    chrome.storage.local.get('settings').then(({ settings = utils.getDefaultSettings() }) => {
      const url = message.url;
      const tabId = sender.tab && sender.tab.id ? sender.tab.id : 0;
      let matched = false;
      if (utils.isYouTubeHomepage(url)) {
        matched = true;
        handleYouTubeHomepage(tabId, url, settings).catch(() => {});
      } else if (utils.isYouTubeChannel(url)) {
        matched = true;
        handleYouTubeChannel(tabId, url, settings).catch(() => {});
      } else if (utils.isYouTubeVideo(url)) {
        matched = true;
        handleYouTubeVideo(tabId, url, settings).catch(() => {});
      } else if (!url.includes('youtube.com') && settings.enableKeywordFilter) {
        matched = true;
        handleNonYouTube(tabId, url, settings).catch(() => {});
      }
      // Log every URL change, even if not matched by above
      if (!matched) {
        // Use logger directly for generic navigation
        import('./logger.js').then(({ default: logger }) => {
          logger.addLog({
            timestamp: new Date().toISOString(),
            url,
            action: 'Tab URL changed (unmatched)',
            type: 'chrome.url.open',
            tabId
          });
        });
      }
    }).catch(() => {});
  }
});

/**
 * Background script for YouTube Monitor Extension
 * Acts as the central controller for the extension
 */

import logger from './logger.js';
import * as utils from './utils.js';

// Initialize the extension
async function initialize() {
  // Initialize logger
  await logger.init();
  // Log extension startup
  await logger.logDebug('Extension started', { event: 'chrome_startup', timestamp: new Date().toISOString() });
  
  // Set up default settings if not already set
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: utils.getDefaultSettings() });
  }
  
  // Set up default allowed channels if not already set
  const { allowedChannels } = await chrome.storage.local.get('allowedChannels');
  if (!allowedChannels) {
    await chrome.storage.local.set({ allowedChannels: utils.getDefaultAllowedChannels() });
  }
  
  // Set up navigation listeners
  setupNavigationListeners();
}

// Set up listeners for web navigation
function setupNavigationListeners() {
  // Listen for page navigation
  chrome.webNavigation.onCompleted.addListener((details) => {
    // Only process main frame navigations
    if (details.frameId !== 0) return;

    const url = details.url;
    const tabId = details.tabId;

    chrome.storage.local.get('settings').then(({ settings = utils.getDefaultSettings() }) => {
      if (utils.isYouTubeHomepage(url)) {
        handleYouTubeHomepage(tabId, url, settings).catch(() => {});
      } else if (utils.isYouTubeChannel(url)) {
        handleYouTubeChannel(tabId, url, settings).catch(() => {});
      } else if (utils.isYouTubeVideo(url)) {
        handleYouTubeVideo(tabId, url, settings).catch(() => {});
      } else if (!url.includes('youtube.com') && settings.enableKeywordFilter) {
        handleNonYouTube(tabId, url, settings).catch(() => {});
      }
    }).catch(() => {});
  });
}

// Handle YouTube homepage
async function handleYouTubeHomepage(tabId, url, settings) {
  // Debug log removed
  if (settings.enableShortsFilter) {
    // Inject content script to hide Shorts
    await chrome.scripting.executeScript({
      target: { tabId },
      function: hideShortsElements
    });
    
    // Log the action
    await logger.logYouTubeHomepage(url, "Shorts hidden");
  }
}

// Handle YouTube channel page
async function handleYouTubeChannel(tabId, url, settings) {
  // Debug log removed
  if (!settings.enableChannelFilter) return;

  // Extract channel ID from URL
  const channelId = utils.extractChannelIdFromUrl(url);
  // Get allowed channels list
  const { allowedChannels = [] } = await chrome.storage.local.get('allowedChannels');
  // Check if channel is allowed
  if (!utils.isChannelAllowed(channelId, allowedChannels)) {
    try {
      // Get the tab's current information
      const tab = await chrome.tabs.get(tabId);
      // Check if the tab exists and its URL is not a restricted chrome:// URL
      if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        // Redirect to YouTube homepage
        await chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
        // Log the action
        await logger.logYouTubeChannel(
          url,
          "Redirected to homepage",
          "Channel not allowed (ID check)"
        );
      } else {
        console.warn(`Skipping redirect for tab ${tabId} because its URL is restricted: ${tab ? tab.url : 'unknown'}. Original navigation URL: ${url}`);
      }
    } catch (error) {
      if (!String(error).includes('Cannot access a chrome:// URL')) {
        console.error(`Error during tab update/check for tab ${tabId} (URL: ${url}):`, error);
      }
      // else: suppress chrome:// error
    }
  } else {
    // Log allowed channel visit
    await logger.logYouTubeChannel(
      url,
      "Allowed channel visit",
      "Channel allowed (ID check)"
    );
  }
}

// Handle YouTube video page
async function handleYouTubeVideo(tabId, url, settings) {
  // Debug log removed
  if (!settings.enableChannelFilter) return;

  // Inject content script to extract channel info
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    function: extractVideoChannelInfoWithId
  });
  // Get channel info from results
  const channelInfo = results[0]?.result;
  if (channelInfo && channelInfo.channelId) {
    // Get allowed channels list
    const { allowedChannels = [] } = await chrome.storage.local.get('allowedChannels');
    // Check if channel is allowed
    if (!utils.isChannelAllowed(channelInfo.channelId, allowedChannels)) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab && tab.url && !tab.url.startsWith('chrome://')) {
          // Redirect to YouTube homepage
          await chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
          // Log the action
          // Detect Shorts by URL or channelInfo
          if (url.includes('/shorts/') || channelInfo.isShorts) {
            await logger.logYouTubeShortsVideo(
              url,
              "Redirected to homepage",
              channelInfo.channelId,
              "Channel not in allowed list (ID check)"
            );
          } else {
            await logger.logYouTubeVideo(
              url,
              "Redirected to homepage",
              channelInfo.channelId,
              "Channel not in allowed list (ID check)"
            );
          }
        } else {
          console.warn(`Skipping redirect for video on tab ${tabId} because its URL is restricted: ${tab ? tab.url : 'unknown'}. Original navigation URL: ${url}`);
        }
      } catch (error) {
        if (!String(error).includes('Cannot access a chrome:// URL')) {
          console.error(`Error during tab update/check for video on tab ${tabId} (URL: ${url}):`, error);
        }
        // else: suppress chrome:// error
      }
    } else {
      // Log allowed video visit
      if (url.includes('/shorts/') || channelInfo.isShorts) {
        await logger.logYouTubeShortsVideo(
          url,
          "Allowed Shorts video visit",
          channelInfo.channelId,
          "Channel allowed (ID check)"
        );
      } else {
        await logger.logYouTubeVideo(
          url,
          "Allowed video visit",
          channelInfo.channelId,
          "Channel allowed (ID check)"
        );
      }
    }
  }
}

// Handle non-YouTube page
async function handleNonYouTube(tabId, url, settings) {
  // Debug logs removed
  if (!settings.enableKeywordFilter) return;
  
  // Inject content script to check for inappropriate content
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    function: checkForInappropriateContent
  });
  
  // Get result from content script
  const inappropriateKeyword = results[0]?.result;
  
  if (inappropriateKeyword) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        // Redirect to YouTube homepage
        await chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
        // Log the action
        await logger.logNonYouTube(
          url, 
          "Redirected to YouTube", 
          `Inappropriate content detected: '${inappropriateKeyword}'`
        );
      } else {
        console.warn(`Skipping redirect for non-YouTube page on tab ${tabId} because its URL is restricted: ${tab ? tab.url : 'unknown'}. Original navigation URL: ${url}`);
      }
    } catch (error) {
      if (!String(error).includes('Cannot access a chrome:// URL')) {
        console.error(`Error during tab update/check for non-YouTube page on tab ${tabId} (URL: ${url}):`, error);
      }
      // else: suppress chrome:// error
    }
  }
}

// Content script function to hide Shorts elements
function hideShortsElements() {
  // Find and hide Shorts sections
  const shortsElements = document.querySelectorAll('ytd-rich-section-renderer');
  shortsElements.forEach(element => {
    // Check if it's a Shorts section
    if (element.textContent.includes('Shorts')) {
      element.style.display = 'none';
    }
  });
  
  // Hide Shorts in the sidebar
  const sidebarItems = document.querySelectorAll('ytd-guide-entry-renderer');
  sidebarItems.forEach(item => {
    if (item.textContent.includes('Shorts')) {
      item.style.display = 'none';
    }
  });
  
  return true;
}

// Content script function to extract channel info from video page (with ID)
function extractVideoChannelInfoWithId() {
  // Try to find channel element
  const channelElement = document.querySelector('ytd-video-owner-renderer a');
  if (channelElement) {
    const channelUrl = channelElement.href;
    let channelId = null;
    // /channel/UCxxxxxxx
    if (channelUrl.includes('/channel/')) {
      channelId = channelUrl.split('/channel/')[1].split(/[/?#]/)[0];
    } else if (channelUrl.includes('/@')) {
      // For /@username, use username as fallback (not robust)
      channelId = channelUrl.split('/@')[1].split(/[/?#]/)[0];
    }
    return {
      channelId,
      channelUrl
    };
  }
  return null;
}

// Content script function to check for inappropriate content
function checkForInappropriateContent() {
  const bodyText = document.body.innerText.toLowerCase();
  
  const keywords = [
    'porn', 'xxx', 'fuck', 'sex', 'adult content', 
    'nudity', 'naked', 'nsfw', 'obscene'
  ];
  
  for (const keyword of keywords) {
    if (bodyText.includes(keyword)) {
      return keyword;
    }
  }
  
  return null;
}

// Initialize the extension
initialize();
