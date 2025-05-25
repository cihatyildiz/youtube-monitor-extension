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
  chrome.webNavigation.onCompleted.addListener(async (details) => {
    // Only process main frame navigations
    if (details.frameId !== 0) return;
    
    const url = details.url;
    const tabId = details.tabId;
    
    // Get current settings
    const { settings = utils.getDefaultSettings() } = await chrome.storage.local.get('settings');
    
    // Process based on URL type
    if (utils.isYouTubeHomepage(url)) {
      await handleYouTubeHomepage(tabId, url, settings);
    } else if (utils.isYouTubeChannel(url)) {
      await handleYouTubeChannel(tabId, url, settings);
    } else if (utils.isYouTubeVideo(url)) {
      await handleYouTubeVideo(tabId, url, settings);
    } else if (!url.includes('youtube.com') && settings.enableKeywordFilter) {
      await handleNonYouTube(tabId, url, settings);
    }
  });
}

// Handle YouTube homepage
async function handleYouTubeHomepage(tabId, url, settings) {
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
  if (!settings.enableChannelFilter) return;

  // Extract channel name from URL
  const channelName = utils.extractChannelFromUrl(url);

  // Get allowed channels list
  const { allowedChannels = [] } = await chrome.storage.local.get('allowedChannels');

  // Check if channel is allowed
  if (!utils.isChannelAllowed(channelName, allowedChannels)) {
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
          "Channel not allowed"
        );
      } else {
        console.warn(`Skipping redirect for tab ${tabId} because its URL is restricted: ${tab ? tab.url : 'unknown'}. Original navigation URL: ${url}`);
      }
    } catch (error) {
      console.error(`Error during tab update/check for tab ${tabId} (URL: ${url}):`, error);
      // Optionally, log this error using your logger module
      // await logger.logError(`Failed to update tab ${tabId}: ${error.message}`);
    }
  }
}

// Handle YouTube video page
async function handleYouTubeVideo(tabId, url, settings) {
  if (!settings.enableChannelFilter) return;
  
  // Inject content script to extract channel info
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    function: extractVideoChannelInfo
  });
  
  // Get channel info from results
  const channelInfo = results[0]?.result;
  
  if (channelInfo) {
    // Get allowed channels list
    const { allowedChannels = [] } = await chrome.storage.local.get('allowedChannels');
    
    // Check if channel is allowed
    if (!utils.isChannelAllowed(channelInfo.channelName, allowedChannels)) {
      // Redirect to YouTube homepage
      await chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
      
      // Log the action
      await logger.logYouTubeVideo(
        url, 
        "Redirected to homepage", 
        channelInfo.channelName,
        "Channel not in allowed list"
      );
    }
  }
}

// Handle non-YouTube page
async function handleNonYouTube(tabId, url, settings) {
  if (!settings.enableKeywordFilter) return;
  
  // Inject content script to check for inappropriate content
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    function: checkForInappropriateContent
  });
  
  // Get result from content script
  const inappropriateKeyword = results[0]?.result;
  
  if (inappropriateKeyword) {
    // Redirect to YouTube homepage
    await chrome.tabs.update(tabId, { url: 'https://www.youtube.com/' });
    
    // Log the action
    await logger.logNonYouTube(
      url, 
      "Redirected to YouTube", 
      `Inappropriate content detected: '${inappropriateKeyword}'`
    );
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

// Content script function to extract channel info from video page
function extractVideoChannelInfo() {
  // Try to find channel element
  const channelElement = document.querySelector('ytd-video-owner-renderer a');
  
  if (channelElement) {
    const channelName = channelElement.textContent.trim();
    const channelUrl = channelElement.href;
    
    return {
      channelName,
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
