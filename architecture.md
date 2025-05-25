# Chrome Extension Architecture

## Overview
This document outlines the architecture of the YouTube Monitor Chrome Extension, which filters and monitors user activity on YouTube and other websites.

## Module Responsibilities

### 1. manifest.json
- Defines extension metadata, permissions, and script execution contexts
- Specifies background scripts, content scripts, and options page
- Declares required permissions: tabs, scripting, storage, activeTab, webNavigation, declarativeContent

### 2. background.js
- Acts as the central controller for the extension
- Listens for navigation events using chrome.webNavigation API
- Detects page types (YouTube homepage, channel page, video page, non-YouTube)
- Initiates content script injection when needed
- Handles page redirections for disallowed channels and inappropriate content
- Communicates with logger.js to record activities

### 3. content.js
- Performs DOM manipulation and content analysis
- Hides YouTube Shorts elements on homepage
- Extracts channel information from video pages
- Scans non-YouTube pages for inappropriate keywords
- Sends results back to background.js for decision making

### 4. logger.js
- Manages all logging operations using chrome.storage.local
- Provides functions to add, retrieve, and clear logs
- Enforces log entry limit (500 entries)
- Handles log format standardization
- Supports enabling/disabling logging functionality

### 5. options.html & options.js
- Provides user interface for extension settings
- Displays and manages feature toggles
- Offers channel management (add/remove allowed channels)
- Shows activity logs in a table format
- Includes controls to clear logs
- Persists user preferences using chrome.storage.local

### 6. utils.js
- Contains shared utility functions
- Provides helper methods for URL parsing
- Includes functions for channel name extraction
- Contains keyword filtering logic
- Offers date/time formatting utilities

### 7. styles.css
- Defines styling for the options page
- Ensures consistent UI appearance
- Provides responsive design elements

## Data Flow

1. **Page Navigation Flow:**
   - User navigates to a webpage
   - background.js detects navigation via webNavigation API
   - Page type is determined based on URL
   - Appropriate action is taken based on page type and settings

2. **YouTube Homepage Flow:**
   - content.js is injected
   - Shorts elements are identified and hidden if feature is enabled
   - Action is logged via logger.js

3. **YouTube Channel Flow:**
   - Channel name/ID is extracted from URL
   - Allowed channel list is retrieved from storage
   - If channel is not allowed, redirect to YouTube homepage
   - Action is logged via logger.js

4. **YouTube Video Flow:**
   - content.js is injected to extract channel information
   - Channel is validated against allowed list
   - If channel is not allowed, redirect to YouTube homepage
   - Action is logged via logger.js

5. **Non-YouTube Content Flow:**
   - content.js scans page content for inappropriate keywords
   - If keywords are found, redirect to YouTube homepage
   - Action is logged via logger.js

6. **Settings Management Flow:**
   - User opens options page
   - options.js loads current settings from storage
   - User modifies settings
   - Changes are saved to storage
   - background.js and content.js adapt behavior based on updated settings

7. **Logging Flow:**
   - Actions trigger log creation in respective modules
   - Log entries are sent to logger.js
   - logger.js prepends new entries to existing logs
   - If log count exceeds 500, oldest entries are removed
   - Updated logs are stored in chrome.storage.local

## Storage Structure

```javascript
// Example storage structure
{
  "settings": {
    "enableShortsFilter": true,
    "enableChannelFilter": true,
    "enableKeywordFilter": true,
    "enableLogging": true
  },
  "allowedChannels": [
    "GoogleDevelopers",
    "TechWithTim",
    "Fireship"
  ],
  "activityLogs": [
    {
      "timestamp": "2025-05-24T15:10:00Z",
      "url": "https://www.youtube.com/",
      "action": "Shorts hidden",
      "type": "YouTube Homepage"
    },
    // Additional log entries...
  ]
}
```
