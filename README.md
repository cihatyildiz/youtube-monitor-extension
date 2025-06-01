# YouTube Monitor Extension

A Chrome extension to monitor, filter, and log YouTube and web activity for safer browsing and content control.

---

## Features

- **YouTube Shorts Filter**: Hides Shorts content on the YouTube homepage.
- **YouTube Channel Filter**: Restricts access to only allowed YouTube channels (by channel ID).
- **YouTube Video Monitoring**: Validates video channel access and redirects if not allowed.
- **Content Keyword Filter**: Scans non-YouTube pages for inappropriate keywords and redirects if found.
- **Activity Logging**: Logs all extension actions and debug events (up to 500 entries).
- **User Options Page**: Configure features, manage allowed channels, and view/clear logs.

---

## How It Works

### 1. Navigation Detection
- The background script (`background.js`) listens for navigation events.
- Determines if the page is a YouTube homepage, channel, video, or non-YouTube.

### 2. Content Scripts
- Injected as needed to:
  - Hide Shorts on homepage
  - Extract channel info from video pages
  - Scan non-YouTube pages for keywords

### 3. Channel Filtering
- Only allows navigation to YouTube channels in your allow-list (by channel ID).
- Redirects to the YouTube homepage if a channel is not allowed.

### 4. Logging
- All actions (filtering, redirections, debug events) are logged via `logger.js`.
- Logs are viewable and clearable from the options page.

### 5. Options Page
- Toggle features on/off
- Add/remove allowed channels
- View and clear activity logs

---

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select the extension folder.
5. The extension icon will appear in your toolbar.

---

## Usage

- Click the extension icon and select "Options" to configure settings.
- Add allowed YouTube channels by channel ID (not name).
- Enable or disable Shorts filtering, channel filtering, keyword filtering, and logging.
- View activity logs for all extension actions.

---

## File Structure

- `manifest.json` — Extension manifest and permissions
- `background.js` — Main logic, navigation detection, and event handling
- `content.js` — DOM manipulation and content analysis
- `logger.js` — Logging utility (stores logs in `chrome.storage.local`)
- `options.html` / `options.js` — User interface for settings and logs
- `utils.js` — Shared utility functions (URL parsing, channel extraction, etc.)
- `styles.css` — Styles for the options page
- `icons/` — Extension icons

---

## Storage Structure

```
{
  "settings": {
    "enableShortsFilter": true,
    "enableChannelFilter": true,
    "enableKeywordFilter": true,
    "enableLogging": true
  },
  "allowedChannels": [
    "UCxxxxxxxxx", // Channel IDs
    ...
  ],
  "activityLogs": [
    {
      "timestamp": "2025-06-01T12:00:00Z",
      "url": "https://www.youtube.com/",
      "action": "Shorts hidden",
      "type": "YouTube Homepage"
    },
    // ...
  ]
}
```

---

## Development Notes

- Written in vanilla JavaScript (ES6 modules).
- Uses Chrome Manifest V3 (service worker background script).
- All settings and logs are stored in `chrome.storage.local`.
- Debug logs are included for troubleshooting and can be viewed in the activity log.

---

## Contributing

Pull requests and suggestions are welcome! Please open an issue for bugs or feature requests.

---

## License

MIT License
