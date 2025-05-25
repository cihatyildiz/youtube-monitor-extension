/**
 * Content script for YouTube Monitor Extension
 * Performs DOM manipulation and content analysis
 */

// Function to hide YouTube Shorts elements on homepage
function hideShortsOnHomepage() {
  // Check if we're on YouTube homepage
  if (window.location.hostname === 'www.youtube.com' && window.location.pathname === '/') {
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
    
    // Set up a mutation observer to hide new Shorts elements that might be added dynamically
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        // Re-run the hiding logic
        const newShortsElements = document.querySelectorAll('ytd-rich-section-renderer');
        newShortsElements.forEach(element => {
          if (element.textContent.includes('Shorts') && element.style.display !== 'none') {
            element.style.display = 'none';
          }
        });
      });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Send message to background script that Shorts were hidden
    chrome.runtime.sendMessage({
      action: 'shortsHidden',
      url: window.location.href
    });
  }
}

// Function to extract channel information from video page
function extractChannelFromVideoPage() {
  // Check if we're on a YouTube video page
  if (window.location.hostname === 'www.youtube.com' && window.location.pathname === '/watch') {
    // Try to find channel element
    const channelElement = document.querySelector('ytd-video-owner-renderer a');
    
    if (channelElement) {
      const channelName = channelElement.textContent.trim();
      const channelUrl = channelElement.href;
      
      // Send channel info to background script
      chrome.runtime.sendMessage({
        action: 'videoChannelInfo',
        channelName,
        channelUrl,
        url: window.location.href
      });
    }
  }
}

// Function to check for inappropriate content on non-YouTube pages
function checkForInappropriateContent() {
  // Skip for YouTube pages
  if (window.location.hostname.includes('youtube.com')) {
    return;
  }
  
  // Get page text content
  const bodyText = document.body.innerText.toLowerCase();
  
  // List of inappropriate keywords
  const keywords = [
    'porn', 'xxx', 'fuck', 'sex', 'adult content', 
    'nudity', 'naked', 'nsfw', 'obscene'
  ];
  
  // Check for keywords
  for (const keyword of keywords) {
    if (bodyText.includes(keyword)) {
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'inappropriateContentDetected',
        keyword,
        url: window.location.href
      });
      break;
    }
  }
}

// Main initialization
function initialize() {
  // Run appropriate functions based on the current page
  if (window.location.hostname === 'www.youtube.com') {
    if (window.location.pathname === '/') {
      // YouTube homepage
      hideShortsOnHomepage();
    } else if (window.location.pathname === '/watch') {
      // YouTube video page
      extractChannelFromVideoPage();
    }
  } else {
    // Non-YouTube page
    checkForInappropriateContent();
  }
}

// Run initialization when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reCheckPage') {
    initialize();
    sendResponse({ success: true });
  }
  return true;
});
